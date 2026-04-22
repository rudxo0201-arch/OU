'use client';

import { useState, useMemo } from 'react';
import {
  Play, Image, FileText, CaretLeft, CaretRight,
  Cards, ListNumbers,
} from '@phosphor-icons/react';
import { tripleToSentence } from '@/lib/triples/sentence-templates';
import type { TriplePredicate } from '@/types';

interface LectureViewProps {
  nodes: any[];
  filters?: Record<string, any>;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  contentType: 'text' | 'video' | 'image' | 'mixed';
  content: string;
  mediaUrl?: string;
  nodeId?: string;
}

export function LectureView({ nodes }: LectureViewProps) {
  const [activeTab, setActiveTab] = useState<string>('content');
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);

  const chapters: Chapter[] = useMemo(() => {
    return nodes.map((node, idx) => {
      const dd = node.domain_data ?? {};
      return {
        id: node.id,
        title: dd.title ?? dd.heading ?? node.raw?.slice(0, 40) ?? `챕터 ${idx + 1}`,
        order: dd.order ?? idx,
        contentType: dd.media_type ?? (dd.video_url ? 'video' : dd.image_url ? 'image' : 'text'),
        content: dd.content ?? node.raw ?? '',
        mediaUrl: dd.video_url ?? dd.image_url ?? dd.file_url ?? null,
        nodeId: node.id,
      };
    }).sort((a, b) => a.order - b.order);
  }, [nodes]);

  const currentChapter = chapters[selectedChapterIdx];
  const progress = chapters.length > 0
    ? Math.round(((selectedChapterIdx + 1) / chapters.length) * 100)
    : 0;

  const quizItems = useMemo(() => {
    const items: { question: string; answer: string }[] = [];
    for (const node of nodes) {
      const dd = node.domain_data ?? {};
      if (dd.question && dd.answer) {
        items.push({ question: dd.question, answer: dd.answer });
      }
      if (dd.triples && Array.isArray(dd.triples)) {
        for (const t of dd.triples) {
          if (t.subject && t.predicate && t.object) {
            items.push({
              question: tripleToSentence({ subject: t.subject, predicate: t.predicate as TriplePredicate, object: '?' }),
              answer: t.object,
            });
          }
        }
      }
    }
    return items;
  }, [nodes]);

  if (chapters.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
        <ListNumbers size={48} weight="light" style={{ color: 'var(--ou-text-muted)' }} />
        <span style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>강의에 넣을 데이터가 없습니다</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 500 }}>
      {/* Left: chapter list */}
      <div style={{ width: 220, borderRight: '0.5px solid var(--ou-border-subtle)', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--ou-border-subtle)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-muted)', textTransform: 'uppercase' }}>
            챕터 ({chapters.length})
          </span>
          <div style={{ height: 3, borderRadius: 2, background: 'var(--ou-border-faint)', marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--ou-text-muted)', borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {chapters.map((ch, idx) => {
              const isActive = idx === selectedChapterIdx;
              const TypeIcon = ch.contentType === 'video' ? Play
                : ch.contentType === 'image' ? Image : FileText;
              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChapterIdx(idx)}
                  style={{
                    display: 'flex', gap: 8, padding: '8px 12px', flexWrap: 'nowrap', alignItems: 'center',
                    cursor: 'pointer',
                    background: isActive ? 'var(--ou-bg)' : 'transparent',
                    boxShadow: isActive ? 'inset var(--ou-neu-pressed-sm)' : undefined,
                    borderBottom: '0.5px solid var(--ou-border-subtle)',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', width: 18, textAlign: 'right' }}>{idx + 1}</span>
                  <TypeIcon size={12} weight="light" />
                  <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '0.5px solid var(--ou-border-subtle)', alignItems: 'center' }}>
          <button
            disabled={selectedChapterIdx === 0}
            onClick={() => setSelectedChapterIdx(i => Math.max(0, i - 1))}
            style={{ background: 'none', border: 'none', cursor: selectedChapterIdx === 0 ? 'default' : 'pointer', padding: 4, color: 'inherit', opacity: selectedChapterIdx === 0 ? 0.3 : 1 }}
          >
            <CaretLeft size={16} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 500 }}>{currentChapter?.title}</span>
          <button
            disabled={selectedChapterIdx === chapters.length - 1}
            onClick={() => setSelectedChapterIdx(i => Math.min(chapters.length - 1, i + 1))}
            style={{ background: 'none', border: 'none', cursor: selectedChapterIdx === chapters.length - 1 ? 'default' : 'pointer', padding: 4, color: 'inherit', opacity: selectedChapterIdx === chapters.length - 1 ? 0.3 : 1 }}
          >
            <CaretRight size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, padding: '0 16px', borderBottom: '0.5px solid var(--ou-border-subtle)' }}>
          {['content', 'quiz', 'overview'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11,
                color: activeTab === tab ? 'inherit' : 'var(--ou-text-muted)',
                borderBottom: activeTab === tab ? '2px solid currentColor' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {tab === 'content' ? '콘텐츠' : tab === 'quiz' ? `퀴즈${quizItems.length > 0 ? ` (${quizItems.length})` : ''}` : '개요'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {activeTab === 'content' && (
            <>
              {currentChapter?.mediaUrl && (
                <div style={{ border: '0.5px solid var(--ou-border-subtle)', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: 'var(--ou-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {currentChapter.contentType === 'video' ? (
                    <video src={currentChapter.mediaUrl} controls style={{ width: '100%', height: '100%' }} />
                  ) : currentChapter.contentType === 'image' ? (
                    <img src={currentChapter.mediaUrl} alt={currentChapter.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <iframe src={currentChapter.mediaUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={currentChapter.title} />
                  )}
                </div>
              )}
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0 }}>
                {currentChapter?.content || '(내용 없음)'}
              </p>
            </>
          )}

          {activeTab === 'quiz' && (
            quizItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {quizItems.map((q, idx) => (
                  <QuizCard key={idx} index={idx} question={q.question} answer={q.answer} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
                <Cards size={48} weight="light" style={{ color: 'var(--ou-text-muted)' }} />
                <span style={{ fontSize: 13, color: 'var(--ou-text-muted)', marginTop: 8 }}>데이터에서 자동 생성할 퀴즈가 없습니다</span>
              </div>
            )
          )}

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-muted)', textTransform: 'uppercase' }}>전체 챕터</span>
              {chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  onClick={() => { setSelectedChapterIdx(idx); setActiveTab('content'); }}
                  style={{ display: 'flex', gap: 8, padding: '4px 0', cursor: 'pointer', borderBottom: '0.5px solid var(--ou-border-subtle)', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', width: 24, textAlign: 'right' }}>{idx + 1}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4 }}>{ch.contentType}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{ch.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizCard({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      onClick={() => setRevealed(r => !r)}
      style={{
        padding: 16,
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 8,
        background: 'var(--ou-bg)',
        boxShadow: revealed ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border-subtle)', borderRadius: 4 }}>Q{index + 1}</span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{question}</span>
      </div>
      {revealed ? (
        <span style={{ fontSize: 13, color: 'var(--ou-text-muted)', paddingLeft: 28, lineHeight: 1.6 }}>
          {answer}
        </span>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', paddingLeft: 28 }}>눌러서 답 확인</span>
      )}
    </div>
  );
}
