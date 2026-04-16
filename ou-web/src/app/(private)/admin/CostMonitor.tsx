'use client';

import { useEffect, useState, useCallback } from 'react';
import { CurrencyDollar, Warning } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface CostLog {
  id: string;
  operation: string;
  model: string;
  tokens: number;
  cost_usd: number;
  created_at: string;
}

type Period = 'today' | 'week' | 'month';

function getStartDate(period: Period): string {
  const d = new Date();
  if (period === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export function CostMonitor() {
  const supabase = createClient();
  const [logs, setLogs] = useState<CostLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [periodCosts, setPeriodCosts] = useState<Record<Period, number>>({ today: 0, week: 0, month: 0 });
  const [operationBreakdown, setOperationBreakdown] = useState<Record<string, number>>({});
  const [modelBreakdown, setModelBreakdown] = useState<Record<string, { cost: number; count: number }>>({});
  const [alertThreshold, setAlertThreshold] = useState<number>(10);
  const [savedThreshold, setSavedThreshold] = useState<number>(10);
  const [filterOp, setFilterOp] = useState<string>('');
  const [operations, setOperations] = useState<string[]>([]);
  const PAGE_SIZE = 20;

  const fetchSummary = useCallback(async () => {
    const periods: Period[] = ['today', 'week', 'month'];
    const results: Record<Period, number> = { today: 0, week: 0, month: 0 };

    await Promise.all(
      periods.map(async (p) => {
        const { data } = await supabase
          .from('api_cost_log')
          .select('cost_usd')
          .gte('created_at', getStartDate(p));
        results[p] = data?.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0) ?? 0;
      })
    );

    setPeriodCosts(results);
  }, []);

  const fetchBreakdown = useCallback(async () => {
    const { data } = await supabase
      .from('api_cost_log')
      .select('operation, model, cost_usd')
      .gte('created_at', getStartDate('month'));

    const opSums: Record<string, number> = {};
    const mdlSums: Record<string, { cost: number; count: number }> = {};
    const ops = new Set<string>();

    data?.forEach(log => {
      opSums[log.operation] = (opSums[log.operation] ?? 0) + (log.cost_usd ?? 0);
      ops.add(log.operation);
      const model = log.model ?? 'unknown';
      if (!mdlSums[model]) mdlSums[model] = { cost: 0, count: 0 };
      mdlSums[model].cost += log.cost_usd ?? 0;
      mdlSums[model].count += 1;
    });

    setOperationBreakdown(opSums);
    setModelBreakdown(mdlSums);
    setOperations(Array.from(ops));
  }, []);

  const fetchLogs = useCallback(async () => {
    let query = supabase
      .from('api_cost_log')
      .select('id, operation, model, tokens, cost_usd, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (filterOp) query = query.eq('operation', filterOp);

    const { data, count } = await query;
    setLogs((data as CostLog[] | null) ?? []);
    setTotal(count ?? 0);
  }, [page, filterOp]);

  useEffect(() => { fetchSummary(); fetchBreakdown(); }, [fetchSummary, fetchBreakdown]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const stored = localStorage.getItem('ou_cost_alert_threshold');
    if (stored) {
      const v = parseFloat(stored);
      setAlertThreshold(v);
      setSavedThreshold(v);
    }
  }, []);

  const saveThreshold = () => {
    localStorage.setItem('ou_cost_alert_threshold', String(alertThreshold));
    setSavedThreshold(alertThreshold);
  };

  const isOverBudget = periodCosts.today > savedThreshold;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Period summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#868e96' }}>오늘</span>
            {isOverBudget && <Warning size={16} color="#fa5252" />}
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: isOverBudget ? 'red' : undefined }}>
            ${periodCosts.today.toFixed(4)}
          </span>
        </div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: 12, color: '#868e96', display: 'block', marginBottom: 8 }}>이번 주</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>${periodCosts.week.toFixed(4)}</span>
        </div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: 12, color: '#868e96', display: 'block', marginBottom: 8 }}>이번 달</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>${periodCosts.month.toFixed(4)}</span>
        </div>
      </div>

      {/* Operation breakdown */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 8px 0' }}>작업별 비용 (이번 달)</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(operationBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([op, cost]) => (
              <span key={op} style={{ background: '#f1f3f5', padding: '4px 10px', borderRadius: 10, fontSize: 12 }}>
                {op}: ${cost.toFixed(4)}
              </span>
            ))}
          {Object.keys(operationBreakdown).length === 0 && (
            <span style={{ fontSize: 13, color: '#868e96' }}>데이터 없음</span>
          )}
        </div>
      </div>

      {/* Model breakdown */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 8px 0' }}>모델별 비용 (이번 달)</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>모델</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>호출 수</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>비용(USD)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(modelBreakdown)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([model, { cost, count }]) => (
                <tr key={model} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <td style={{ padding: '8px', fontSize: 12 }}>{model}</td>
                  <td style={{ padding: '8px', fontSize: 12 }}>{count.toLocaleString()}</td>
                  <td style={{ padding: '8px', fontSize: 12, fontWeight: 600 }}>${cost.toFixed(4)}</td>
                </tr>
              ))}
            {Object.keys(modelBreakdown).length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: '#868e96' }}>데이터 없음</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Alert threshold */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 8px 0' }}>일일 비용 알림 기준</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: 4, overflow: 'hidden', width: 120 }}>
            <span style={{ padding: '4px 6px', background: '#f8f9fa', fontSize: 12 }}>$</span>
            <input
              type="number"
              value={alertThreshold}
              onChange={e => setAlertThreshold(parseFloat(e.target.value) || 10)}
              min={0}
              step={1}
              style={{ padding: '4px 8px', border: 'none', outline: 'none', width: '100%', fontSize: 12 }}
            />
          </div>
          <button
            onClick={saveThreshold}
            disabled={alertThreshold === savedThreshold}
            style={{ padding: '4px 12px', background: alertThreshold === savedThreshold ? '#e9ecef' : '#343a40', color: alertThreshold === savedThreshold ? '#868e96' : '#fff', border: 'none', borderRadius: 4, cursor: alertThreshold === savedThreshold ? 'default' : 'pointer', fontSize: 12 }}
          >
            저장
          </button>
          <span style={{ fontSize: 12, color: '#868e96' }}>현재 기준: ${savedThreshold}</span>
        </div>
      </div>

      {/* Recent calls table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>최근 API 호출</span>
        <select
          value={filterOp}
          onChange={e => setFilterOp(e.target.value)}
          style={{ width: 160, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">작업 필터</option>
          {operations.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>작업</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>모델</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>토큰</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>비용(USD)</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>시각</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
              <td style={{ padding: '8px' }}>
                <span style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{log.operation}</span>
              </td>
              <td style={{ padding: '8px', fontSize: 12 }}>{log.model}</td>
              <td style={{ padding: '8px', fontSize: 12 }}>{log.tokens?.toLocaleString()}</td>
              <td style={{ padding: '8px', fontSize: 12, color: log.cost_usd > 0.01 ? 'red' : undefined }}>
                ${log.cost_usd?.toFixed(6)}
              </td>
              <td style={{ padding: '8px', fontSize: 12, color: '#868e96' }}>
                {new Date(log.created_at).toLocaleString('ko-KR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <p style={{ color: '#868e96', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>기록이 없어요.</p>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: '4px 10px', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                background: p === page ? '#333' : '#fff',
                color: p === page ? '#fff' : '#333',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
