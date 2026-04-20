/**
 * YouTube RSS 피드 크롤러
 *
 * YouTube Data API 미사용. 공개 RSS 피드 + oEmbed로 피드 구성.
 * API 할당량 제한 없음.
 *
 * RSS URL: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 */

export interface YTFeedVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number | null;
  description: string | null;
  url: string;
}

// ─── XML 파싱 유틸 ────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

function extractNsTag(xml: string, ns: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${ns}:${tag}[^>]*>([\\s\\S]*?)<\\/${ns}:${tag}>`));
  return match ? match[1].trim() : null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*/?>`);
  const match = xml.match(re);
  return match ? match[1] : null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ─── 단일 엔트리 파싱 ─────────────────────────────────────────────────────────

function parseEntry(entryXml: string, channelName: string): YTFeedVideo | null {
  const videoId = extractNsTag(entryXml, 'yt', 'videoId');
  const channelId = extractNsTag(entryXml, 'yt', 'channelId');
  const title = extractTag(entryXml, 'title');
  const publishedAt = extractTag(entryXml, 'published');

  // media:thumbnail url="..."
  const thumbnailUrl =
    extractAttr(entryXml, 'media:thumbnail', 'url') ??
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null);

  // media:statistics views="..."
  const viewsMatch = entryXml.match(/media:statistics\s+views="(\d+)"/);

  // media:description
  const descMatch = entryXml.match(/<media:description>([\s\S]*?)<\/media:description>/);

  if (!videoId || !title || !channelId) return null;

  return {
    videoId,
    title: decodeXml(title),
    channelId,
    channelName: decodeXml(channelName),
    publishedAt: publishedAt ?? new Date().toISOString(),
    thumbnailUrl: thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    viewCount: viewsMatch ? parseInt(viewsMatch[1], 10) : null,
    description: descMatch ? decodeXml(descMatch[1].trim()) : null,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// ─── 채널 RSS fetch ────────────────────────────────────────────────────────────

export async function fetchChannelVideos(channelId: string): Promise<YTFeedVideo[]> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OUBot/1.0)' },
      next: { revalidate: 1800 }, // Next.js 30분 캐시
    });
    if (!res.ok) return [];

    const xml = await res.text();

    // 채널명: 피드 최상단 <title>
    const feedTitleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const channelName = feedTitleMatch ? feedTitleMatch[1].trim() : '';

    // <entry> 블록 분리
    const entries = xml.split('<entry>').slice(1);
    return entries
      .map(e => parseEntry(e, channelName))
      .filter((v): v is YTFeedVideo => v !== null);
  } catch {
    return [];
  }
}

// ─── 인기 영상 fetch (YouTube 트렌딩 RSS 대안) ───────────────────────────────

export async function fetchTrendingVideos(region = 'KR'): Promise<YTFeedVideo[]> {
  // YouTube는 트렌딩 RSS를 제공하지 않음.
  // 대신 유명 뉴스/테크 채널 큐레이션 채널들을 기본으로 사용하거나,
  // 회원 구독 채널이 없을 때 빈 배열 반환 → URL 붙여넣기로 안내.
  return [];
}

// ─── 피드 조합 ────────────────────────────────────────────────────────────────

export async function buildFeed(channelIds: string[]): Promise<YTFeedVideo[]> {
  if (channelIds.length === 0) return [];

  const results = await Promise.allSettled(
    channelIds.map(id => fetchChannelVideos(id))
  );

  const videos = results
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    // 최신순 정렬
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    // 최대 100개
    .slice(0, 100);

  return videos;
}

// ─── 조회수 포맷 ─────────────────────────────────────────────────────────────

export function formatViewCount(count: number | null): string {
  if (count === null) return '';
  if (count >= 100_000_000) return `${(count / 100_000_000).toFixed(1)}억회`;
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)}만회`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}천회`;
  return `${count}회`;
}

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;
  if (months < 12) return `${months}개월 전`;
  return `${years}년 전`;
}
