'use client';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

/**
 * 상한론 공부뷰
 * - 편(chapter) 탭 필터 + 섹션 필터
 * - 원문/해석/증후/처방명 통합 검색
 * - 조문 카드 목록 + 상세 패널
 * - 이전/다음 조문 이동
 */

// ── 편 순서 ──
const CHAPTER_ORDER = ['태양병', '양명병', '소양병', '태음병', '소음병', '궐음병', '곽란병', '음양역', '노복'] as const;

interface Article {
  id: string;
  nodeId: string;
  articleNumber: number;
  originalText: string;
  translation: string;
  chapter: string;
  section: string;
  relatedFormulas: string[];
  formulaNames: string[];
  keyСoncepts: string[];
  syndrome: string;
}

function parseArticles(nodes: ViewProps['nodes']): Article[] {
  return nodes
    .filter(n => n.domain_data?.type === 'shanghanlun')
    .map(n => ({
      id: n.domain_data.article_id || n.id,
      nodeId: n.id,
      articleNumber: n.domain_data.article_number || 0,
      originalText: n.domain_data.original_text || '',
      translation: n.domain_data.translation || '',
      chapter: n.domain_data.chapter || '',
      section: n.domain_data.section || '',
      relatedFormulas: n.domain_data.related_formulas || [],
      formulaNames: n.domain_data.formula_names || [],
      keyСoncepts: n.domain_data.key_concepts || [],
      syndrome: n.domain_data.syndrome || '',
    }))
    .sort((a, b) => a.articleNumber - b.articleNumber);
}

export function ShanghanlunView({ nodes }: ViewProps) {
  const [chapterFilter, setChapterFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Article | null>(null);

  const allArticles = useMemo(() => parseArticles(nodes), [nodes]);

  // 편별 카운트 (빈 편 숨김)
  const chapterCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allArticles) {
      map.set(a.chapter, (map.get(a.chapter) || 0) + 1);
    }
    return map;
  }, [allArticles]);

  // 현재 편의 세부 섹션 목록
  const sections = useMemo(() => {
    const base = chapterFilter ? allArticles.filter(a => a.chapter === chapterFilter) : allArticles;
    const set = new Set(base.map(a => a.section).filter(Boolean));
    return Array.from(set);
  }, [allArticles, chapterFilter]);

  // 필터링
  const filtered = useMemo(() => {
    let result = allArticles;
    if (chapterFilter) result = result.filter(a => a.chapter === chapterFilter);
    if (sectionFilter) result = result.filter(a => a.section === sectionFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.originalText.includes(q) ||
        a.translation.toLowerCase().includes(q) ||
        a.syndrome.toLowerCase().includes(q) ||
        a.formulaNames.some(f => f.includes(q)) ||
        a.keyСoncepts.some(k => k.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allArticles, chapterFilter, sectionFilter, search]);

  // 이전/다음 조문 (filtered 기준)
  const selectedIdx = selected ? filtered.findIndex(a => a.id === selected.id) : -1;
  const prevArticle = selectedIdx > 0 ? filtered[selectedIdx - 1] : null;
  const nextArticle = selectedIdx < filtered.length - 1 ? filtered[selectedIdx + 1] : null;

  const handleChapterSelect = (ch: string) => {
    setChapterFilter(chapterFilter === ch ? '' : ch);
    setSectionFilter('');
    setSelected(null);
  };

  if (allArticles.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📜</div>
        상한론 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── 목록 패널 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-heading)' }}>상한론 📜</span>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
            {filtered.length}/{allArticles.length}조
          </span>
        </div>

        {/* 검색 */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="원문, 해석, 증후, 처방명 검색..."
            style={{
              width: '100%', padding: '8px 14px', fontSize: 12, boxSizing: 'border-box',
              border: '0.5px solid var(--ou-border-faint)', borderRadius: 10,
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
              color: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* 편 탭 */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          <ChapterChip
            label="전체"
            count={allArticles.length}
            active={!chapterFilter}
            onClick={() => handleChapterSelect('')}
          />
          {CHAPTER_ORDER.filter(ch => chapterCounts.has(ch)).map(ch => (
            <ChapterChip
              key={ch}
              label={ch.replace('병', '').replace('역', '역').replace('란', '란')}
              count={chapterCounts.get(ch) || 0}
              active={chapterFilter === ch}
              onClick={() => handleChapterSelect(ch)}
            />
          ))}
        </div>

        {/* 섹션 필터 (편 선택 시 & 섹션 2개 이상) */}
        {chapterFilter && sections.length > 1 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            <SectionChip label="전체" active={!sectionFilter} onClick={() => setSectionFilter('')} />
            {sections.map(sec => (
              <SectionChip
                key={sec}
                label={sec.replace(chapterFilter, '').trim() || sec}
                active={sectionFilter === sec}
                onClick={() => setSectionFilter(sectionFilter === sec ? '' : sec)}
              />
            ))}
          </div>
        )}

        {/* 조문 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              isSelected={selected?.id === article.id}
              onClick={() => setSelected(selected?.id === article.id ? null : article)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 12 }}>
            검색 결과 없음
          </div>
        )}
      </div>

      {/* ── 상세 패널 ── */}
      {selected && (
        <div style={{
          width: 360, flexShrink: 0, overflow: 'auto',
          borderLeft: '0.5px solid var(--ou-border-faint)',
          padding: 20,
          animation: 'ou-fade-in 0.15s ease',
        }}>
          <DetailPanel
            article={selected}
            prev={prevArticle}
            next={nextArticle}
            onClose={() => setSelected(null)}
            onNavigate={setSelected}
          />
        </div>
      )}
    </div>
  );
}

// ── 편 탭 칩 ──
function ChapterChip({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
        border: '0.5px solid var(--ou-border-subtle)',
        background: active ? 'var(--ou-bg)' : 'transparent',
        boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'none',
        color: active ? 'var(--ou-text-body)' : 'var(--ou-text-muted)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {label}
      <span style={{ fontSize: 9, opacity: 0.6 }}>{count}</span>
    </button>
  );
}

// ── 섹션 칩 ──
function SectionChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
        border: '0.5px solid var(--ou-border-faint)',
        background: active ? 'var(--ou-bg)' : 'transparent',
        boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'none',
        color: active ? 'var(--ou-text-body)' : 'var(--ou-text-muted)',
      }}
    >
      {label}
    </button>
  );
}

// ── 조문 카드 ──
function ArticleCard({ article, isSelected, onClick }: {
  article: Article; isSelected: boolean; onClick: () => void;
}) {
  // 원문 앞 32자
  const textPreview = article.originalText.length > 32
    ? article.originalText.slice(0, 32) + '…'
    : article.originalText;

  // 해석 앞 40자
  const transPreview = article.translation.length > 40
    ? article.translation.slice(0, 40) + '…'
    : article.translation;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        border: `0.5px solid ${isSelected ? 'var(--ou-border-subtle)' : 'var(--ou-border-faint)'}`,
        background: 'var(--ou-bg)',
        boxShadow: isSelected ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
        transition: '100ms ease',
      }}
    >
      {/* 번호 + 원문 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--ou-text-disabled)',
          flexShrink: 0, minWidth: 36,
        }}>
          제{article.articleNumber}조
        </span>
        <span style={{ fontSize: 12, color: 'var(--ou-text-body)', lineHeight: 1.4 }}>
          {textPreview}
        </span>
      </div>

      {/* 해석 미리보기 */}
      {article.translation && (
        <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', lineHeight: 1.4, marginBottom: 4, paddingLeft: 44 }}>
          {transPreview}
        </div>
      )}

      {/* 처방명 태그 */}
      {article.formulaNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingLeft: 44 }}>
          {article.formulaNames.slice(0, 3).map((f, i) => (
            <span key={i} style={{
              padding: '1px 7px', borderRadius: 999, fontSize: 9,
              border: '0.5px solid var(--ou-border-faint)',
              color: 'var(--ou-text-disabled)',
            }}>
              {f}
            </span>
          ))}
          {article.formulaNames.length > 3 && (
            <span style={{ fontSize: 9, color: 'var(--ou-text-disabled)' }}>
              +{article.formulaNames.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── 상세 패널 ──
function DetailPanel({ article, prev, next, onClose, onNavigate }: {
  article: Article;
  prev: Article | null;
  next: Article | null;
  onClose: () => void;
  onNavigate: (a: Article) => void;
}) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', marginBottom: 4 }}>
            {article.section}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)' }}>
            제{article.articleNumber}조
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 26, height: 26, borderRadius: '50%', background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-sm)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 14, color: 'var(--ou-text-disabled)',
          flexShrink: 0,
        }}>×</button>
      </div>

      {/* 원문 */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-inset)',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 6, letterSpacing: 1 }}>
          原文
        </div>
        <div style={{
          fontSize: 14, lineHeight: 1.8, color: 'var(--ou-text-body)',
          fontFamily: 'serif', letterSpacing: 0.5,
        }}>
          {article.originalText}
        </div>
      </div>

      {/* 해석 */}
      {article.translation && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 6, letterSpacing: 1 }}>
            解釋
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ou-text-body)' }}>
            {article.translation}
          </div>
        </div>
      )}

      {/* 증후 */}
      {article.syndrome && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 6, letterSpacing: 1 }}>
            證候
          </div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
            {article.syndrome}
          </div>
        </div>
      )}

      {/* 핵심개념 태그 */}
      {article.keyСoncepts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 6, letterSpacing: 1 }}>
            核心概念
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {article.keyСoncepts.map((k, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11,
                border: '0.5px solid var(--ou-border-faint)',
                color: 'var(--ou-text-muted)',
              }}>
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 관련 처방 */}
      {article.formulaNames.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 6, letterSpacing: 1 }}>
            關聯處方
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {article.formulaNames.map((f, i) => (
              <span key={i} style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12,
                border: '0.5px solid var(--ou-border-subtle)',
                background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
                color: 'var(--ou-text-body)',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 이전/다음 이동 */}
      <div style={{ display: 'flex', gap: 8, borderTop: '0.5px solid var(--ou-border-faint)', paddingTop: 14 }}>
        <NavButton
          label={prev ? `← 제${prev.articleNumber}조` : ''}
          disabled={!prev}
          onClick={() => prev && onNavigate(prev)}
        />
        <NavButton
          label={next ? `제${next.articleNumber}조 →` : ''}
          disabled={!next}
          onClick={() => next && onNavigate(next)}
          align="right"
        />
      </div>
    </div>
  );
}

// ── 이동 버튼 ──
function NavButton({ label, disabled, onClick, align = 'left' }: {
  label: string; disabled: boolean; onClick: () => void; align?: 'left' | 'right';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 11,
        border: '0.5px solid var(--ou-border-faint)',
        background: disabled ? 'transparent' : 'var(--ou-bg)',
        boxShadow: disabled ? 'none' : 'var(--ou-neu-raised-sm)',
        color: disabled ? 'transparent' : 'var(--ou-text-muted)',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: align,
      }}
    >
      {label}
    </button>
  );
}
