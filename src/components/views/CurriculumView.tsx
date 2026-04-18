'use client';

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

function buildCurriculum(nodes: any[]): Chapter[] {
  // 교육/미디어 도메인 노드를 챕터별로 그룹핑
  const eduNodes = nodes.filter(n =>
    n.domain === 'education' || n.domain === 'media' || n.domain === 'knowledge'
  );

  if (eduNodes.length === 0) return [];

  // section 정보가 있으면 챕터로 사용, 없으면 도메인별 그룹
  const grouped = new Map<string, Lesson[]>();

  for (const node of eduNodes) {
    const chapter = node.domain_data?.chapter
      || node.domain_data?.category
      || node.domain === 'media' ? '영상 자료' : '학습 자료';

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
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed, #888)', fontSize: 13 }}>
        커리큘럼에 표시할 자료가 없습니다. 유튜브 영상이나 학습 자료를 추가해보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-strong, #fff)' }}>
            커리큘럼
          </span>
          <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed, #888)' }}>
            {completedCount}/{totalLessons} 완료
          </span>
        </div>
        <div style={{
          height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%',
            borderRadius: 2,
            background: 'rgba(255,255,255,0.4)',
            transition: '300ms ease',
          }} />
        </div>
      </div>

      {/* Chapters */}
      {chapters.map((chapter, ci) => {
        const chapterCompleted = chapter.lessons.filter(l => isCompleted(l)).length;
        const isOpen = expandedChapter === ci;

        return (
          <div key={ci} style={{ marginBottom: 8 }}>
            {/* Chapter header */}
            <button
              onClick={() => setExpandedChapter(isOpen ? -1 : ci)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
                background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: '150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  {isOpen ? '▼' : '▶'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong, #fff)' }}>
                  {chapter.title}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>
                {chapterCompleted}/{chapter.lessons.length}
              </span>
            </button>

            {/* Lessons */}
            {isOpen && (
              <div style={{ padding: '4px 0 4px 24px' }}>
                {chapter.lessons.map(lesson => (
                  <div
                    key={lesson.id}
                    onClick={() => toggleComplete(lesson.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderRadius: 6,
                      transition: '150ms ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: isCompleted(lesson)
                        ? '1.5px solid rgba(255,255,255,0.4)'
                        : '1.5px solid rgba(255,255,255,0.15)',
                      background: isCompleted(lesson) ? 'rgba(255,255,255,0.4)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isCompleted(lesson) && (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5.5L4 7.5L8 3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>

                    {/* Type icon */}
                    <span style={{ fontSize: 12, flexShrink: 0 }}>
                      {lesson.type === 'video' ? '▶' : '📄'}
                    </span>

                    {/* Title */}
                    <span style={{
                      fontSize: 13, flex: 1,
                      color: isCompleted(lesson) ? 'var(--ou-text-dimmed, #888)' : 'var(--ou-text-secondary, #ccc)',
                      textDecoration: isCompleted(lesson) ? 'line-through' : 'none',
                    }}>
                      {lesson.title}
                    </span>

                    {/* Duration */}
                    {lesson.duration && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                        {lesson.duration}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
