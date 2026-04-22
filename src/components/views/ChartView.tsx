'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import styles from './ChartView.module.css';

dayjs.locale('ko');

// ── 상수 ──────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  '식비':    '#FF9F7A', '교통':    '#7AB8FF', '쇼핑':    '#FF7AB8',
  '문화':    '#B87AFF', '의료':    '#7AFFB8', '교육':    '#FFE97A',
  '주거':    '#A0CCFF', '통신':    '#C8C8C8', '여가':    '#FFA0C8',
  '기타':    '#A0A0A0',
  '급여':    '#7AFFB8', '용돈':    '#A8E6A8', '부업':    '#7AFFE0',
  '투자':    '#B8FFA0', '환급':    '#D4FFA8', '기타수입': '#88CC88',
};

// ── 파서 ──────────────────────────────────────────────────────────────────
interface FinanceItem {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  date: string;
  title: string;
}

function parseFinance(nodes: ViewProps['nodes']): FinanceItem[] {
  const result: FinanceItem[] = [];
  for (const n of nodes) {
    if (n.domain !== 'finance' || !n.domain_data) continue;
    const type: 'expense' | 'income' =
      n.domain_data.type === 'income' ? 'income' : 'expense';

    if (Array.isArray(n.domain_data.items)) {
      for (const it of n.domain_data.items) {
        result.push({
          id: n.id + it.name,
          type: it.type === 'income' ? 'income' : 'expense',
          amount: Math.abs(Number(it.amount)) || 0,
          category: it.category ?? '기타',
          date: n.domain_data.date ?? n.created_at ?? '',
          title: it.name || it.title || '지출',
        });
      }
    } else if (n.domain_data.amount != null) {
      result.push({
        id: n.id,
        type,
        amount: Math.abs(Number(n.domain_data.amount)) || 0,
        category: n.domain_data.category ?? '기타',
        date: n.domain_data.date ?? n.created_at ?? '',
        title: n.domain_data.title || (n.raw ?? '').slice(0, 30) || (type === 'income' ? '수입' : '지출'),
      });
    }
  }
  return result.sort((a, b) => (a.date > b.date ? -1 : 1));
}

// ── SVG 도넛 차트 ─────────────────────────────────────────────────────────
function DonutChart({ data, total, size = 160, stroke = 24 }: {
  data: [string, number][];
  total: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none"
          stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
        <text x={cx} y={cy} textAnchor="middle" dy="0.35em"
          fill="var(--ou-text-disabled)" fontSize="11">기록 없음</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={radius} fill="none"
        stroke="rgba(0,0,0,0.04)" strokeWidth={stroke} />
      {data.map(([cat, amt]) => {
        const ratio = amt / total;
        const dash = ratio * circ;
        const el = (
          <circle key={cat} cx={cx} cy={cy} r={radius} fill="none"
            stroke={CAT_COLORS[cat] || '#aaa'}
            strokeWidth={stroke}
            strokeDasharray={`${dash - 1} ${circ - dash + 1}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transition: '400ms ease' }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

// ── 월별 바 차트 (듀얼: 수입 + 지출) ────────────────────────────────────
function MonthlyBarChart({ items }: { items: FinanceItem[] }) {
  const months = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => dayjs().subtract(5 - i, 'month')),
  []);

  const data = useMemo(() =>
    months.map(m => {
      const key = m.format('YYYY-MM');
      const expense = items
        .filter(it => it.type === 'expense' && dayjs(it.date).format('YYYY-MM') === key)
        .reduce((s, it) => s + it.amount, 0);
      const income = items
        .filter(it => it.type === 'income' && dayjs(it.date).format('YYYY-MM') === key)
        .reduce((s, it) => s + it.amount, 0);
      return { label: m.format('M월'), expense, income, key };
    }),
  [months, items]);

  const max = Math.max(...data.flatMap(d => [d.expense, d.income]), 1);
  const currentKey = dayjs().format('YYYY-MM');

  return (
    <div className={styles.barChartWrap}>
      {data.map(d => {
        const isCurrent = d.key === currentKey;
        const expH = Math.max((d.expense / max) * 132, d.expense > 0 ? 3 : 0);
        const incH = Math.max((d.income / max) * 132, d.income > 0 ? 3 : 0);
        return (
          <div key={d.key} className={styles.barCol}>
            <div className={styles.barInner}>
              {d.income > 0 && (
                <div className={styles.barSegment} style={{
                  height: expH > 0 ? incH : incH,
                  background: isCurrent ? 'rgba(22,163,74,0.55)' : 'rgba(22,163,74,0.2)',
                }} />
              )}
              {d.expense > 0 && (
                <div className={styles.barSegment} style={{
                  height: expH,
                  background: isCurrent ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.12)',
                }} />
              )}
            </div>
            <span className={isCurrent ? styles.barLabelActive : styles.barLabel}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
type DonutTab = 'expense' | 'income';

export function ChartView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [donutTab, setDonutTab] = useState<DonutTab>('expense');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const currentMonth = dayjs().subtract(monthOffset, 'month');
  const prevMonth    = dayjs().subtract(monthOffset + 1, 'month');
  const allItems = useMemo(() => parseFinance(nodes), [nodes]);

  const monthItems = useMemo(() =>
    allItems.filter(it => dayjs(it.date).format('YYYY-MM') === currentMonth.format('YYYY-MM')),
  [allItems, currentMonth]);

  const prevItems = useMemo(() =>
    allItems.filter(it => dayjs(it.date).format('YYYY-MM') === prevMonth.format('YYYY-MM')),
  [allItems, prevMonth]);

  const expenses     = monthItems.filter(it => it.type === 'expense');
  const incomes      = monthItems.filter(it => it.type === 'income');
  const totalExpense = expenses.reduce((s, it) => s + it.amount, 0);
  const totalIncome  = incomes.reduce((s, it) => s + it.amount, 0);
  const net          = totalIncome - totalExpense;

  const prevExpense = prevItems.filter(it => it.type === 'expense').reduce((s, it) => s + it.amount, 0);
  const prevIncome  = prevItems.filter(it => it.type === 'income').reduce((s, it) => s + it.amount, 0);
  const prevNet     = prevIncome - prevExpense;

  function pctDelta(curr: number, prev: number): number | null {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }

  const donutItems = donutTab === 'expense' ? expenses : incomes;
  const donutTotal = donutTab === 'expense' ? totalExpense : totalIncome;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of donutItems) {
      map[it.category] = (map[it.category] ?? 0) + it.amount;
    }
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [donutItems]);

  const allCats = useMemo(() => {
    const seen = new Set<string>();
    for (const it of monthItems) seen.add(it.category);
    return Array.from(seen);
  }, [monthItems]);

  const filteredItems = useMemo(() => {
    let items = monthItems;
    if (catFilter !== 'all') items = items.filter(it => it.category === catFilter);
    if (search) items = items.filter(it => it.title.includes(search) || it.category.includes(search));
    return items;
  }, [monthItems, catFilter, search]);

  // ── 인라인 모드 ──
  if (inline) {
    return (
      <div style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1 }}>지출</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
            {totalExpense.toLocaleString()}원
          </span>
        </div>
        {totalIncome > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1 }}>수입</span>
            <span style={{ fontSize: 13, color: 'var(--ou-success)' }}>
              +{totalIncome.toLocaleString()}원
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── 빈 상태 ──
  if (allItems.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>◈</div>
        <div>
          <div className={styles.emptyTitle}>가계부가 비어 있습니다</div>
          <div className={styles.emptyHint}>"오늘 커피 5000원" 처럼 말해보세요</div>
        </div>
      </div>
    );
  }

  function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
    const d = pctDelta(curr, prev);
    if (d === null) return null;
    const isUp = d > 0;
    return (
      <span className={`${styles.summaryDelta} ${isUp ? styles.deltaUp : styles.deltaDown}`}>
        {isUp ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% 전월 대비
      </span>
    );
  }

  return (
    <div className={styles.root}>

      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={() => setMonthOffset(m => m + 1)}>◀</button>
          <span className={styles.monthLabel}>{currentMonth.format('YYYY년 M월')}</span>
          <button className={styles.navBtn}
            onClick={() => setMonthOffset(m => Math.max(0, m - 1))}
            disabled={monthOffset === 0}>▶</button>
        </div>
        <div className={styles.tabRow}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t}
              className={`${styles.tab} ${donutTab === t ? styles.tabActive : ''}`}
              onClick={() => { setDonutTab(t); setCatFilter('all'); }}>
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 요약 카드 3개 ── */}
      <div className={styles.summaryGrid}>
        {/* 총 지출 — dark card */}
        <div className={styles.summaryCardDark}>
          <div className={styles.summaryLabelDark}>총 지출</div>
          <div className={styles.summaryAmountDark}>
            {totalExpense.toLocaleString()}<span className={styles.summaryUnit}>원</span>
          </div>
          {prevExpense > 0 && (() => {
            const d = pctDelta(totalExpense, prevExpense);
            if (d === null) return null;
            const isUp = d > 0;
            return (
              <span style={{
                marginTop: 8, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
                color: isUp ? 'rgba(248,113,113,0.9)' : 'rgba(134,239,172,0.9)',
              }}>
                {isUp ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% 전월 대비
              </span>
            );
          })()}
        </div>

        {/* 총 수입 */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>총 수입</div>
          <div className={styles.summaryAmount}>
            {totalIncome.toLocaleString()}<span className={styles.summaryUnit}>원</span>
          </div>
          <DeltaBadge curr={totalIncome} prev={prevIncome} />
        </div>

        {/* 순 저축 / 초과 */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{net >= 0 ? '순 저축' : '초과 지출'}</div>
          <div className={styles.summaryAmount} style={{
            color: net >= 0 ? 'var(--ou-success)' : 'var(--ou-error)',
          }}>
            {net >= 0 ? '+' : ''}{net.toLocaleString()}<span className={styles.summaryUnit}>원</span>
          </div>
          <DeltaBadge curr={Math.abs(net)} prev={Math.abs(prevNet)} />
        </div>
      </div>

      {/* ── 차트 2컬럼 ── */}
      <div className={styles.chartGrid}>
        {/* 도넛 차트 + 카테고리 */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardTitle}>카테고리 분석</div>
          <div className={styles.donutWrap}>
            <DonutChart data={byCategory} total={donutTotal} size={160} stroke={24} />
            <div className={styles.donutCenter}>
              <div className={styles.donutCenterLabel}>{donutTab === 'expense' ? '총 지출' : '총 수입'}</div>
              <div className={styles.donutCenterAmount}>{donutTotal.toLocaleString()}</div>
              <div className={styles.donutCenterUnit}>원</div>
            </div>
          </div>
          <div className={styles.catList}>
            {byCategory.slice(0, 6).map(([cat, amt]) => {
              const pct = donutTotal > 0 ? (amt / donutTotal) * 100 : 0;
              const catItems = donutItems.filter(it => it.category === cat);
              const isExpanded = expandedCat === cat;
              return (
                <div key={cat}>
                  <div className={styles.catItem}
                    onClick={() => setExpandedCat(isExpanded ? null : cat)}>
                    <div className={styles.catDot}
                      style={{ background: CAT_COLORS[cat] || '#aaa' }} />
                    <span className={styles.catName}>{cat}</span>
                    <div className={styles.catBar}>
                      <div className={styles.catBarFill}
                        style={{ width: `${pct}%`, background: CAT_COLORS[cat] || '#aaa' }} />
                    </div>
                    <span className={styles.catPct}>{pct.toFixed(0)}%</span>
                    <span className={styles.catAmount}>{amt.toLocaleString()}원</span>
                  </div>
                  {isExpanded && catItems.length > 0 && (
                    <div className={styles.catDetail}>
                      {catItems.map((it, i) => (
                        <div key={`${it.id}-${i}`} className={styles.catDetailItem}>
                          <div>
                            <div className={styles.catDetailTitle}>{it.title}</div>
                            <div className={styles.catDetailDate}>
                              {it.date ? dayjs(it.date).format('M월 D일') : ''}
                            </div>
                          </div>
                          <span className={styles.catDetailAmount}>
                            {it.type === 'income' ? '+' : '-'}{it.amount.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 월별 바 차트 */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardTitle}>
            최근 6개월 트렌드
            <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 8, color: 'var(--ou-text-disabled)' }}>
              <span style={{ color: 'rgba(22,163,74,0.7)' }}>■</span> 수입&nbsp;
              <span style={{ color: 'rgba(0,0,0,0.5)' }}>■</span> 지출
            </span>
          </div>
          <MonthlyBarChart items={allItems} />
        </div>
      </div>

      {/* ── 거래 내역 테이블 ── */}
      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <span className={styles.tableTitle}>거래 내역</span>
          <input
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
          />
          <div className={styles.filterChips}>
            {['all', ...allCats].map(cat => (
              <button key={cat}
                className={`${styles.chip} ${catFilter === cat ? styles.chipActive : ''}`}
                onClick={() => setCatFilter(cat)}>
                {cat === 'all' ? '전체' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableHeader}>
          <div className={styles.thCell} />
          <div className={styles.thCell}>내역</div>
          <div className={styles.thCell}>카테고리</div>
          <div className={styles.thCell} style={{ textAlign: 'right' }}>금액</div>
          <div className={styles.thCell} style={{ textAlign: 'right' }}>날짜</div>
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--ou-text-disabled)' }}>
            거래 내역이 없습니다
          </div>
        ) : (
          filteredItems.map((it, i) => (
            <div key={`${it.id}-${i}`} className={styles.tableRow}>
              <div className={styles.rowIcon} style={{
                background: `${CAT_COLORS[it.category] || '#aaa'}22`,
                color: CAT_COLORS[it.category] || '#aaa',
              }}>
                {it.category.slice(0, 1)}
              </div>
              <div className={styles.rowTitle}>{it.title}</div>
              <div className={styles.rowCategory}>{it.category}</div>
              <div className={`${styles.rowAmount} ${it.type === 'income' ? styles.rowAmountIncome : styles.rowAmountExpense}`}>
                {it.type === 'income' ? '+' : '-'}{it.amount.toLocaleString()}원
              </div>
              <div className={styles.rowDate}>
                {it.date ? dayjs(it.date).format('M월 D일 (ddd)') : ''}
              </div>
            </div>
          ))
        )}

        {filteredItems.length > 0 && (
          <div className={styles.tableFooter}>
            <span className={styles.tableFooterCount}>{filteredItems.length}건</span>
            <span className={styles.tableFooterTotal}>
              {filteredItems.reduce((s, it) => s + it.amount, 0).toLocaleString()}원
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
