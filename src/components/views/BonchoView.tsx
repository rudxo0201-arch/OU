'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ViewProps } from './registry';

/**
 * 본초학 뷰
 * 참고: Epocrates (약학 레퍼런스), Anki (암기), 본초학 교과서
 * - 카테고리/성/미/귀경 필터
 * - 카드 그리드 (한자 + 성미귀경)
 * - 상세 패널 (효능/주치 + 관련 처방)
 * - 비교 모드 (2~3개 약재 나란히)
 */

// ── 성미귀경 필터 옵션 ──
const NATURE_OPTIONS = ['寒', '微寒', '涼', '平', '溫', '微溫', '熱', '大熱'] as const;
const FLAVOR_OPTIONS = ['辛', '甘', '苦', '酸', '鹹', '淡', '澀'] as const;
const CHANNEL_OPTIONS = ['肺經', '心經', '脾經', '肝經', '腎經', '胃經', '大腸經', '小腸經', '膀胱經', '膽經', '三焦經', '心包經'] as const;

const NATURE_COLORS: Record<string, string> = {
  '寒': 'rgba(100,160,255,0.2)', '微寒': 'rgba(100,160,255,0.12)',
  '涼': 'rgba(140,200,255,0.15)', '平': 'rgba(200,200,200,0.12)',
  '溫': 'rgba(255,180,100,0.15)', '微溫': 'rgba(255,180,100,0.1)',
  '熱': 'rgba(255,120,80,0.2)', '大熱': 'rgba(255,80,60,0.25)',
};

interface Herb {
  id: string;
  name: string;
  hanja: string | null;
  starred: boolean;
  categoryMinor: string | null;
  nature: string[];
  flavor: string[];
  channelTropism: string[];
  efficacy: string[];
  indications: string[];
}

interface Formula {
  name: string;
  hanja: string;
  role: string;
  dosage: string;
}

function parseHerbs(nodes: any[]): Herb[] {
  return nodes
    .filter(n => n.domain === 'knowledge' && n.domain_data?.herb_id)
    .map(n => ({
      id: n.id,
      name: n.domain_data.name_korean || n.domain_data.herb_id,
      hanja: n.domain_data.name_hanja,
      starred: n.domain_data.starred || false,
      categoryMinor: n.domain_data.category_minor,
      nature: n.domain_data.nature || [],
      flavor: n.domain_data.flavor || [],
      channelTropism: n.domain_data.channel_tropism || [],
      efficacy: n.domain_data.efficacy || [],
      indications: n.domain_data.indications || [],
    }));
}

function findFormulas(nodes: any[], herbName: string): Formula[] {
  const results: Formula[] = [];
  for (const n of nodes) {
    if (!n.domain_data?.formula_id) continue;
    const comp = n.domain_data.composition || [];
    for (const c of comp) {
      if (c.herb_name === herbName) {
        results.push({
          name: n.domain_data.name_korean || n.domain_data.formula_id,
          hanja: n.domain_data.name_hanja || '',
          role: c.role || '',
          dosage: c.dosage || '',
        });
        break;
      }
    }
  }
  return results;
}

// ── 카테고리 추출 (번호 제거) ──
function getCategoryLabel(cat: string | null): string {
  if (!cat) return '미분류';
  return cat.replace(/^\d+-?\d*\.\s*/, '');
}

function getCategoryGroup(cat: string | null): string {
  if (!cat) return '미분류';
  const match = cat.match(/^(\d+)/);
  return match ? match[1] : '기타';
}

export function BonchoView({ nodes }: ViewProps) {
  const [search, setSearch] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [natureFilter, setNatureFilter] = useState<string>('');
  const [flavorFilter, setFlavorFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selected, setSelected] = useState<Herb | null>(null);
  const [compareList, setCompareList] = useState<Herb[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const allHerbs = useMemo(() => parseHerbs(nodes), [nodes]);

  // 카테고리 목록
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of allHerbs) {
      const label = getCategoryLabel(h.categoryMinor);
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allHerbs]);

  // 필터링
  const filtered = useMemo(() => {
    let result = allHerbs;
    if (starredOnly) result = result.filter(h => h.starred);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.hanja?.includes(q) ||
        h.efficacy.some(e => e.includes(q)) ||
        h.indications.some(i => i.includes(q))
      );
    }
    if (natureFilter) result = result.filter(h => h.nature.includes(natureFilter));
    if (flavorFilter) result = result.filter(h => h.flavor.includes(flavorFilter));
    if (channelFilter) result = result.filter(h => h.channelTropism.includes(channelFilter));
    if (categoryFilter) result = result.filter(h => getCategoryLabel(h.categoryMinor) === categoryFilter);
    return result;
  }, [allHerbs, search, starredOnly, natureFilter, flavorFilter, channelFilter, categoryFilter]);

  // 관련 처방
  const relatedFormulas = useMemo(() => {
    if (!selected) return [];
    return findFormulas(nodes, selected.name);
  }, [selected, nodes]);

  const toggleCompare = useCallback((herb: Herb) => {
    setCompareList(prev => {
      if (prev.find(h => h.id === herb.id)) return prev.filter(h => h.id !== herb.id);
      if (prev.length >= 3) return prev;
      return [...prev, herb];
    });
  }, []);

  if (allHerbs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🌿</div>
        본초 데이터가 없습니다. 관리자 설정에서 본초 시딩을 실행하세요.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── 메인 (목록) ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-strong)' }}>본초학 🌿</span>
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{filtered.length}/{allHerbs.length}</span>
          </div>
          {compareList.length > 0 && (
            <button
              onClick={() => setShowCompare(!showCompare)}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 11,
                border: '1px solid rgba(255,255,255,0.2)',
                background: showCompare ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: 'var(--ou-text-secondary)', cursor: 'pointer',
              }}
            >
              비교 ({compareList.length})
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="약재명, 한자, 효능, 주치 검색..."
            style={{
              width: '100%', padding: '8px 14px', fontSize: 12,
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', color: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {/* Starred + Category */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Chip label="전체" active={!starredOnly && !categoryFilter} onClick={() => { setStarredOnly(false); setCategoryFilter(''); }} />
            <Chip label="★ 주요" active={starredOnly} onClick={() => { setStarredOnly(!starredOnly); setCategoryFilter(''); }} />
            {categories.slice(0, 8).map(([cat, count]) => (
              <Chip key={cat} label={`${cat}`} active={categoryFilter === cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)} />
            ))}
          </div>

          {/* 性 */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 16, flexShrink: 0 }}>性</span>
            {NATURE_OPTIONS.map(n => (
              <MiniChip key={n} label={n} active={natureFilter === n}
                color={NATURE_COLORS[n]}
                onClick={() => setNatureFilter(natureFilter === n ? '' : n)} />
            ))}
          </div>

          {/* 味 */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 16, flexShrink: 0 }}>味</span>
            {FLAVOR_OPTIONS.map(f => (
              <MiniChip key={f} label={f} active={flavorFilter === f}
                onClick={() => setFlavorFilter(flavorFilter === f ? '' : f)} />
            ))}
          </div>

          {/* 歸經 */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 16, flexShrink: 0 }}>經</span>
            {CHANNEL_OPTIONS.map(c => (
              <MiniChip key={c} label={c.replace('經', '')} active={channelFilter === c}
                onClick={() => setChannelFilter(channelFilter === c ? '' : c)} />
            ))}
          </div>
        </div>

        {/* Compare panel */}
        {showCompare && compareList.length > 0 && (
          <ComparePanel herbs={compareList} onRemove={h => toggleCompare(h)} />
        )}

        {/* Card grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}>
          {filtered.map(herb => (
            <HerbCard
              key={herb.id}
              herb={herb}
              isSelected={selected?.id === herb.id}
              isComparing={!!compareList.find(h => h.id === herb.id)}
              onClick={() => setSelected(selected?.id === herb.id ? null : herb)}
              onCompare={() => toggleCompare(herb)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ou-text-dimmed)', fontSize: 12 }}>
            검색 결과 없음
          </div>
        )}
      </div>

      {/* ── 상세 패널 (오른쪽) ── */}
      {selected && (
        <div style={{
          width: 320, flexShrink: 0, overflow: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          padding: 20,
          animation: 'ou-fade-in 0.2s ease',
        }}>
          <DetailPanel herb={selected} formulas={relatedFormulas} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

// ── 약재 카드 ──
function HerbCard({ herb, isSelected, isComparing, onClick, onCompare }: {
  herb: Herb; isSelected: boolean; isComparing: boolean;
  onClick: () => void; onCompare: () => void;
}) {
  const natureColor = herb.nature[0] ? (NATURE_COLORS[herb.nature[0]] || 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.02)';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 10px',
        borderRadius: 10,
        border: isSelected ? '1px solid rgba(255,255,255,0.25)' : isComparing ? '1px solid rgba(120,200,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
        background: natureColor,
        cursor: 'pointer',
        transition: '150ms ease',
        position: 'relative',
      }}
    >
      {/* Star */}
      {herb.starred && (
        <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, opacity: 0.4 }}>★</span>
      )}

      {/* Name */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-strong)', marginBottom: 2 }}>
        {herb.name}
      </div>
      {herb.hanja && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{herb.hanja}</div>
      )}

      {/* 性味 */}
      <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', lineHeight: 1.5 }}>
        {herb.nature.length > 0 && <span>{herb.nature.join('·')}</span>}
        {herb.nature.length > 0 && herb.flavor.length > 0 && <span> / </span>}
        {herb.flavor.length > 0 && <span>{herb.flavor.join('·')}</span>}
      </div>

      {/* 歸經 */}
      {herb.channelTropism.length > 0 && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          {herb.channelTropism.map(c => c.replace('經', '')).join(' ')}
        </div>
      )}

      {/* Compare button */}
      <button
        onClick={e => { e.stopPropagation(); onCompare(); }}
        title="비교에 추가"
        style={{
          position: 'absolute', bottom: 6, right: 6,
          width: 18, height: 18, borderRadius: 4, fontSize: 10,
          border: '0.5px solid rgba(255,255,255,0.1)',
          background: isComparing ? 'rgba(120,200,255,0.2)' : 'transparent',
          color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isComparing ? '✓' : '+'}
      </button>
    </div>
  );
}

// ── 상세 패널 ──
function DetailPanel({ herb, formulas, onClose }: { herb: Herb; formulas: Formula[]; onClose: () => void }) {
  const ROLE_LABELS: Record<string, string> = { '군': '君(군)', '신': '臣(신)', '좌': '佐(좌)', '보': '使(사)' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ou-text-strong)' }}>{herb.name}</div>
          {herb.hanja && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{herb.hanja}</div>}
          {herb.categoryMinor && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              {getCategoryLabel(herb.categoryMinor)}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.3)',
        }}>×</button>
      </div>

      {/* 성미귀경 */}
      <Section title="性味歸經">
        <InfoRow label="性 (성)" value={herb.nature.join(', ') || '-'} />
        <InfoRow label="味 (미)" value={herb.flavor.join(', ') || '-'} />
        <InfoRow label="歸經" value={herb.channelTropism.join(', ') || '-'} />
      </Section>

      {/* 효능 */}
      {herb.efficacy.length > 0 && (
        <Section title="效能 (효능)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {herb.efficacy.map((e, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11,
                border: '0.5px solid rgba(255,255,255,0.1)',
                color: 'var(--ou-text-secondary)',
              }}>{e}</span>
            ))}
          </div>
        </Section>
      )}

      {/* 주치 */}
      {herb.indications.length > 0 && (
        <Section title="主治 (주치)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {herb.indications.map((ind, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11,
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ou-text-dimmed)',
              }}>{ind}</span>
            ))}
          </div>
        </Section>
      )}

      {/* 관련 처방 */}
      {formulas.length > 0 && (
        <Section title={`📋 관련 처방 (${formulas.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {formulas.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 6,
                border: '0.5px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>{f.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{f.hanja}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {f.role && (
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 4,
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.4)',
                    }}>{ROLE_LABELS[f.role] || f.role}</span>
                  )}
                  {f.dosage && (
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{f.dosage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── 비교 패널 ──
function ComparePanel({ herbs, onRemove }: { herbs: Herb[]; onRemove: (h: Herb) => void }) {
  const fields = ['성(性)', '미(味)', '귀경', '효능', '주치'] as const;
  const getField = (herb: Herb, field: string): string => {
    switch (field) {
      case '성(性)': return herb.nature.join(', ') || '-';
      case '미(味)': return herb.flavor.join(', ') || '-';
      case '귀경': return herb.channelTropism.map(c => c.replace('經', '')).join(', ') || '-';
      case '효능': return herb.efficacy.join(', ') || '-';
      case '주치': return herb.indications.slice(0, 3).join(', ') || '-';
      default: return '-';
    }
  };

  return (
    <div style={{
      marginBottom: 16, borderRadius: 12,
      border: '1px solid rgba(120,200,255,0.15)',
      background: 'rgba(120,200,255,0.03)',
      overflow: 'auto',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}></th>
            {herbs.map(h => (
              <th key={h.id} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>{h.name}</span>
                  <button onClick={() => onRemove(h)} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>×</button>
                </div>
                {h.hanja && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{h.hanja}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map(field => (
            <tr key={field}>
              <td style={{ padding: '6px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, borderTop: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}>{field}</td>
              {herbs.map(h => (
                <td key={h.id} style={{ padding: '6px 10px', color: 'var(--ou-text-secondary)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', lineHeight: 1.5 }}>
                  {getField(h, field)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 공통 ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 0.5 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 11,
      border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      color: active ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
      cursor: 'pointer', transition: '100ms ease',
    }}>
      {label}
    </button>
  );
}

function MiniChip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '2px 7px', borderRadius: 4, fontSize: 10,
      border: active ? '1px solid rgba(255,255,255,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
      background: active ? (color || 'rgba(255,255,255,0.1)') : 'transparent',
      color: active ? 'var(--ou-text-strong)' : 'rgba(255,255,255,0.35)',
      cursor: 'pointer', transition: '100ms ease',
    }}>
      {label}
    </button>
  );
}
