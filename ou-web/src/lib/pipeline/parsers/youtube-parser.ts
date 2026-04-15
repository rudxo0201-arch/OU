/**
 * YouTube Parser — 자막 수집 + 메타데이터 + STT 검수 + 챕터 파싱
 *
 * ou-study/app/api/process/route.ts 에서 검증된 로직 기반
 * OU 시스템(sections/sentences)에 맞게 재구성
 */

import { YoutubeTranscript } from 'youtube-transcript';
import { completeWithFallback } from '@/lib/llm/router';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface YouTubeChapter {
  title: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  duration: number | null;       // seconds
  publishedAt: string | null;
  viewCount: number | null;
  description: string | null;
  chapters: YouTubeChapter[];
}

export interface TranscriptSegment {
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

export interface ParsedSection {
  heading: string;
  sentences: { text: string; startTime: number; endTime: number }[];
}

export interface ParsedYouTube {
  metadata: YouTubeMetadata;
  transcript: TranscriptSegment[];
  transcriptRaw: string;
  transcriptCorrected: string | null;
  sections: ParsedSection[];
  language: string;
  commentDigest: string[];
}

// ─── Video ID 추출 ─────────────────────────────────────────────────────────

export function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const embedMatch = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

// ─── 메타데이터 수집 (ou-study:11-51) ──────────────────────────────────────

async function fetchMetadataOEmbed(videoId: string): Promise<Partial<YouTubeMetadata>> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    return {
      title: data.title as string,
      channelName: data.author_name as string,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return {};
  }
}

async function fetchMetadataAPI(videoId: string): Promise<Partial<YouTubeMetadata> & { description?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return {};

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return {};

    // ISO 8601 duration → seconds
    const iso = item.contentDetails?.duration ?? '';
    const dMatch = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const duration = dMatch
      ? (parseInt(dMatch[1] ?? '0') * 3600 + parseInt(dMatch[2] ?? '0') * 60 + parseInt(dMatch[3] ?? '0'))
      : null;

    return {
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.high?.url ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics?.viewCount ?? '0'),
      duration,
      description: item.snippet.description,
    };
  } catch {
    return {};
  }
}

export async function fetchMetadata(videoId: string): Promise<YouTubeMetadata> {
  // 병렬: oEmbed + API (API 없으면 oEmbed 폴백)
  const [oembed, api] = await Promise.all([
    fetchMetadataOEmbed(videoId),
    fetchMetadataAPI(videoId),
  ]);

  const description = (api as { description?: string }).description ?? null;
  const chapters = description ? parseChapters(description) : [];

  return {
    videoId,
    title: api.title ?? oembed.title ?? videoId,
    channelName: api.channelName ?? oembed.channelName ?? '',
    thumbnailUrl: api.thumbnailUrl ?? oembed.thumbnailUrl ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    duration: api.duration ?? null,
    publishedAt: api.publishedAt ?? null,
    viewCount: api.viewCount ?? null,
    description,
    chapters,
  };
}

// ─── 챕터 파싱 (description에서 타임스탬프 추출) ───────────────────────────

function parseChapters(description: string): YouTubeChapter[] {
  const lines = description.split('\n');
  const chapters: { title: string; startTime: number }[] = [];

  for (const line of lines) {
    const match = line.match(/^(\d{1,2}:)?(\d{1,2}):(\d{2})\s+(.+)$/);
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const startTime = hours * 3600 + minutes * 60 + seconds;
      const title = match[4].trim();
      chapters.push({ title, startTime });
    }
  }

  if (chapters.length < 2) return []; // 챕터는 최소 2개부터 의미

  // endTime 계산 (다음 챕터의 startTime)
  return chapters.map((ch, i) => ({
    title: ch.title,
    startTime: ch.startTime,
    endTime: i < chapters.length - 1 ? chapters[i + 1].startTime : Infinity,
  }));
}

// ─── 자막 수집 (ou-study:100-108) ──────────────────────────────────────────

export async function fetchTranscript(videoId: string): Promise<{ segments: TranscriptSegment[]; language: string } | null> {
  try {
    // ko 우선, 실패 시 아무 언어
    let items: { text: string; offset: number; duration: number }[];
    let language = 'ko';
    try {
      items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
    } catch {
      items = await YoutubeTranscript.fetchTranscript(videoId);
      language = 'unknown';
    }

    const segments: TranscriptSegment[] = items.map(item => ({
      text: item.text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim(),
      startTime: item.offset / 1000,
      endTime: (item.offset + item.duration) / 1000,
    }));

    return { segments, language };
  } catch {
    return null;
  }
}

// ─── STT 검수 (ou-study:111-121 + 제목 맥락 추가) ─────────────────────────

export async function correctTranscript(rawText: string, title: string): Promise<string> {
  try {
    const result = await completeWithFallback(
      [{
        role: 'user',
        content: `다음 STT 전사본을 교정해주세요:\n\n${rawText}`,
      }],
      {
        system: `이 영상의 주제는 "${title}"입니다. STT 전사본에서 잘못 인식된 단어·표현만 수정하세요. 특히 주제 관련 전문 용어의 오타에 주의하세요. 내용 추가/삭제/재구성은 절대 금지. 교정된 텍스트만 출력하세요.`,
        temperature: 0.2,
        maxTokens: 8192,
        operation: 'youtube_stt_correction',
      },
    );
    return result.text;
  } catch {
    return rawText; // 실패 시 원본 반환
  }
}

// ─── 영어 감지 (ou-study:131-137) ──────────────────────────────────────────

export function isEnglish(text: string): boolean {
  const cleaned = text.replace(/\s/g, '');
  if (cleaned.length === 0) return false;
  const koreanChars = (text.match(/[가-힣]/g) ?? []).length;
  return koreanChars / cleaned.length < 0.1;
}

// ─── 영어 → 한국어 번역 ────────────────────────────────────────────────────

async function translateText(text: string): Promise<string> {
  try {
    const result = await completeWithFallback(
      [{
        role: 'user',
        content: text,
      }],
      {
        system: '주어진 영어 텍스트를 자연스러운 한국어로 번역하세요. 번역된 텍스트만 출력하세요.',
        temperature: 0.2,
        maxTokens: 8192,
        operation: 'youtube_translate',
      },
    );
    return result.text;
  } catch {
    return text;
  }
}

// ─── 댓글 다이제스트 (ou-study:54-97, 선택적) ─────────────────────────────

async function fetchComments(videoId: string): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map(
      (item: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }) =>
        item.snippet.topLevelComment.snippet.textOriginal,
    );
  } catch {
    return [];
  }
}

async function digestComments(comments: string[]): Promise<string[]> {
  if (comments.length === 0) return [];
  const sample = comments.slice(0, 50).join('\n---\n');
  try {
    const result = await completeWithFallback(
      [{ role: 'user', content: `댓글 목록:\n${sample}` }],
      {
        system: `유튜브 댓글을 분석하는 전문가입니다.
아래 댓글들을 읽고, 전체 반응의 스펙트럼을 대표하는 짧은 댓글 8~10개를 직접 창작하세요.

규칙:
- 실제 댓글처럼 자연스러운 구어체로 작성
- 긍정, 부정, 의문, 공감, 재치 등 다양한 톤 포함
- 각 댓글은 1~2문장, 50자 이내
- JSON 배열로만 출력: ["댓글1", "댓글2", ...]`,
        temperature: 0.7,
        maxTokens: 1024,
        operation: 'youtube_comment_digest',
      },
    );
    const match = result.text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]) as string[];
  } catch {
    return [];
  }
}

// ─── 섹션 구조화 (챕터 또는 3분 청크) ──────────────────────────────────────

function buildSections(
  segments: TranscriptSegment[],
  chapters: YouTubeChapter[],
): ParsedSection[] {
  if (chapters.length >= 2) {
    // 챕터 기반 섹션
    return chapters.map(chapter => {
      const sentences = segments
        .filter(s => s.startTime >= chapter.startTime && s.startTime < chapter.endTime)
        .map(s => ({ text: s.text, startTime: s.startTime, endTime: s.endTime }));
      return { heading: chapter.title, sentences };
    }).filter(s => s.sentences.length > 0);
  }

  // 3분 단위 자동 분할
  if (segments.length === 0) return [];

  const CHUNK_SEC = 180; // 3분
  const maxTime = segments[segments.length - 1].endTime;
  const sections: ParsedSection[] = [];

  for (let start = 0; start < maxTime; start += CHUNK_SEC) {
    const end = start + CHUNK_SEC;
    const sentences = segments
      .filter(s => s.startTime >= start && s.startTime < end)
      .map(s => ({ text: s.text, startTime: s.startTime, endTime: s.endTime }));

    if (sentences.length > 0) {
      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };
      sections.push({
        heading: `${formatTime(start)} ~ ${formatTime(Math.min(end, maxTime))}`,
        sentences,
      });
    }
  }

  return sections;
}

// ─── 메인 파서 ─────────────────────────────────────────────────────────────

export async function parseYouTubeVideo(videoId: string): Promise<ParsedYouTube | null> {
  // 1. 병렬: 메타데이터 + 자막 + 댓글
  const [metadata, transcriptResult, rawComments] = await Promise.all([
    fetchMetadata(videoId),
    fetchTranscript(videoId),
    fetchComments(videoId),
  ]);

  // 자막 없으면 메타데이터만 반환
  if (!transcriptResult) {
    return {
      metadata,
      transcript: [],
      transcriptRaw: '',
      transcriptCorrected: null,
      sections: [],
      language: 'unknown',
      commentDigest: [],
    };
  }

  const { segments, language } = transcriptResult;
  const rawText = segments.map(s => s.text).join(' ');

  // 2. 병렬: STT 검수 + 댓글 다이제스트
  const [correctedText, commentDigest] = await Promise.all([
    correctTranscript(rawText, metadata.title),
    digestComments(rawComments),
  ]);

  // 3. 영어 영상이면 번역
  let finalText = correctedText;
  if (isEnglish(correctedText)) {
    finalText = await translateText(correctedText);
  }

  // 4. 섹션 구조화
  // 검수된 텍스트를 segments에 다시 매핑하지 않음 (타임스탬프 유지 위해 원본 segment 사용)
  const sections = buildSections(segments, metadata.chapters);

  return {
    metadata,
    transcript: segments,
    transcriptRaw: rawText,
    transcriptCorrected: finalText,
    sections,
    language: isEnglish(rawText) ? 'en' : language,
    commentDigest,
  };
}
