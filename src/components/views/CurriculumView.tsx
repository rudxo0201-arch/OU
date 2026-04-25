'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

/**
 * 커리큘럼 뷰
 * 참고: Udemy 코스 사이드바, Coursera 진도, Notion 로드맵
 * - 챕터/레슨 트리 구조
 * - 진도 체크 (체크박스)
 * - 영상/자료 노드 연결
 */

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'article' | 'note';
  duration?: string;
  videoId?: string;
  raw?: string;
  completed: boolean;
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

function buildCurriculum(nodes: ViewProps['nodes']): Chapter[] {
  // 교육/미디어 도메인 노드를 챕터별로 그룹핑
  const eduNodes = nodes.filter(n =>
    n.domain === DOMAINS.EDUCATION || n.domain === DOMAINS.MEDIA || n.domain === DOMAINS.KNOWLEDGE
  );

  if (eduNodes.length === 0) return [];

  // section 정보가 있으면 챕터로 사용, 없으면 도메인별 그룹
  const grouped = new Map<string, Lesson[]>();

  for (const node of eduNodes) {
    const chapter = node.domain_data?.chapter
      || node.domain_data?.category
      || node.domain === DOMAINS.MEDIA ? '영상 자료' : '학습 자료';

    if (!grouped.has(chapter)) grouped.set(chapter, []);

    grouped.get(chapter)!.push({
      id: node.id,
      title: node.domain_data?.title || (node.raw ?? '').slice(0, 50) || '레슨',
      type: node.domain_data?.video_id ? 'video' : 'note',
      duration: node.domain_data?.duration,
      videoId: node.domain_data?.video_id,
      raw: node.raw,
      completed: node.domain_data?.completed === true,
    });
  }

  return Array.from(grouped.entries()).map(([title, lessons]) => ({ title, lessons }));
}

export function CurriculumView({ nodes }: ViewProps) {
  const chapters = useMemo(() => buildCurriculum(nodes), [nodes]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedChapter, setExpandedChapter] = useState<number>(0);

  const toggleComplete = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isCompleted = (lesson: Lesson) =>
    lesson.completed || completedIds.has(lesson.id);

  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedCount = chapters.reduce((sum, ch) =>
    sum + ch.lessons.filter(l => isCompleted(l)).length, 0);
  const progress = totalLessons > 0 ? completedCount / totalLessons : 0;

  if (chapters.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        커리큘럼에 표시할 자료가 없습니다. 유튜브 영상이나 학습 자료를 추가해보세요.
      </div>
    );
  }

  const currentChapter = chapters[expandedChapter] ?? chapters[0];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ── 좌측 사이드바: 챕터 목록 + 진행률 ── */}
      <div style={{
        width: 240, flexShrink: 0,
        background: 'var(--ou-glass)',
        borderRight: '1px solid var(--ou-glass-border)',
        overflowY: 'auto',
        padding: '20px 12px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 진행률 */}
        <div style={{ padding: '0 8px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ou-text-muted)' }}>커리큘럼</span>
            <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{completedCount}/{totalLessons}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 2, background: 'var(--ou-text-heading)', transition: '300ms ease' }} />
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--ou-glass-border)', marginBottom: 8 }} />
        {/* 챕터 리스트 */}
        {chapters.map((chapter, ci) => {
          const chapterCompleted = chapter.lessons.filter(l => isCompleted(l)).length;
          const isActive = expandedChapter === ci;
          return (
            <button key={ci} onClick={() => setExpandedChapter(ci)} style={{
              textAlign: 'left', padding: '10px 10px', borderRadius: 8, border: 'none',
              background: isActive ? 'rgba(0,0,0,0.07)' : 'transparent',
              cursor: 'pointer', marginBottom: 2,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--ou-text-heading)' : 'var(--ou-text-body)' }}>
                  {chapter.title}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', background: 'rgba(0,0,0,0.05)', borderRadius: 999, padding: '1px 6px' }}>
                  {chapterCompleted}/{chapter.lessons.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 우측 레슨 목록 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 40px' }}>
        {currentChapter && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ou-text-heading)', margin: '0 0 4px' }}>
                {currentChapter.title}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
                {currentChapter.lessons.filter(l => isCompleted(l)).length}/{currentChapter.lessons.length} 완료
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {currentChapter.lessons.map(lesson => (
                <div key={lesson.id} onClick={() => toggleComplete(lesson.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)',
                  transition: '150ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ou-glass-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--ou-glass)')}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${isCompleted(lesson) ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.18)'}`,
                    background: isCompleted(lesson) ? 'rgba(0,0,0,0.65)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isCompleted(lesson) && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{lesson.type === 'video' ? '▶' : '📄'}</span>
                  <span style={{
                    fontSize: 14, flex: 1,
                    color: isCompleted(lesson) ? 'var(--ou-text-muted)' : 'var(--ou-text-body)',
                    textDecoration: isCompleted(lesson) ? 'line-through' : 'none',
                  }}>
                    {lesson.title}
                  </span>
                  {lesson.duration && (
                    <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', flexShrink: 0 }}>{lesson.duration}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
