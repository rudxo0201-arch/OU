'use client';

import { useState } from 'react';
import { Robot, Play, Stop, FloppyDisk, GitBranch } from '@phosphor-icons/react';

/** Agent definitions (client-side mirror of registry) */
const AGENTS = [
  { id: 'scenario-analyzer', nameKo: '시나리오 분석', model: 'haiku', description: '시나리오에서 필요한 기능/도메인/뷰/도구를 분석' },
  { id: 'feature-planner', nameKo: '기능 기획', model: 'haiku', description: '신규 기능 vs 기존 기능, 갭 도출' },
  { id: 'spec-designer', nameKo: '설계', model: 'sonnet', description: '컴포넌트/API/데이터 모델 설계' },
  { id: 'implementation-advisor', nameKo: '구현 가이드', model: 'sonnet', description: '파일 변경, 구현 순서, 테스트 케이스 제안' },
  { id: 'qa-agent', nameKo: 'QA 검증', model: 'haiku', description: '시나리오 대비 구현 검증 및 점수' },
];

type PipelineStage = 'analyze' | 'plan' | 'spec' | 'implement' | 'qa';

const STAGE_OPTIONS: Array<{ value: PipelineStage | 'all'; label: string }> = [
  { value: 'analyze', label: '분석까지' },
  { value: 'plan', label: '기획까지' },
  { value: 'spec', label: '설계까지' },
  { value: 'implement', label: '구현 가이드까지' },
  { value: 'all', label: '전체 (QA 포함)' },
];

interface PipelineResult {
  scenarioId: string;
  scenarioText: string;
  analysis: any;
  plan: any;
  spec: any;
  implementation: any;
  qa: any;
  status: 'complete' | 'partial' | 'failed';
  error?: string;
  stoppedAt?: string;
  costSummary: { totalTokens: number; stages: Record<string, number> };
}

export function AgentDashboard() {
  const [scenarioText, setScenarioText] = useState('');
  const [stopAfter, setStopAfter] = useState<string>('all');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const runPipeline = async () => {
    if (!scenarioText.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const body: any = { scenarioText: scenarioText.trim() };
      if (stopAfter !== 'all') {
        body.stopAfter = stopAfter;
      }

      const res = await fetch('/api/admin/agents/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: PipelineResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Pipeline execution failed');
    } finally {
      setRunning(false);
    }
  };

  const savePlanAsNode = async () => {
    if (!result?.plan) return;
    alert('기획서가 DataNode로 저장되었습니다. (구현 예정)');
  };

  const createIssuesFromGaps = async () => {
    if (!result?.plan?.gaps?.length) return;
    alert(`${result.plan.gaps.length}개 이슈가 생성되었습니다. (구현 예정)`);
  };

  const statusColor = (s: string) => s === 'complete' ? '#40c057' : s === 'partial' ? '#fab005' : '#fa5252';
  const statusLabel = (s: string) => s === 'complete' ? '완료' : s === 'partial' ? '부분 완료' : '실패';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Agent Registry */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 16px 0' }}>등록된 에이전트</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {AGENTS.map(agent => (
            <div key={agent.id} style={{ padding: 8, border: '1px solid #e0e0e0', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Robot size={16} weight="light" />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{agent.nameKo}</span>
                <span style={{ background: agent.model === 'sonnet' ? '#343a40' : '#f1f3f5', color: agent.model === 'sonnet' ? '#fff' : '#495057', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                  {agent.model}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#868e96' }}>{agent.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Runner */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 16px 0' }}>시나리오 파이프라인 실행</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            placeholder="시나리오 텍스트를 입력하세요..."
            rows={4}
            value={scenarioText}
            onChange={(e) => setScenarioText(e.currentTarget.value)}
            disabled={running}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13, resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={stopAfter}
              onChange={(e) => setStopAfter(e.target.value)}
              disabled={running}
              style={{ width: 160, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
            >
              {STAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={runPipeline}
              disabled={running || !scenarioText.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: running || !scenarioText.trim() ? 'default' : 'pointer', fontSize: 12, opacity: running || !scenarioText.trim() ? 0.5 : 1 }}
            >
              {running ? '...' : <Play size={14} weight="fill" />}
              {running ? '실행 중...' : '파이프라인 실행'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 16, background: '#fff5f5', borderRadius: 8, border: '1px solid #ffc9c9' }}>
          <span style={{ fontSize: 13, color: '#c92a2a' }}>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>결과</span>
              <span style={{ background: `${statusColor(result.status)}20`, color: statusColor(result.status), padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                {statusLabel(result.status)}
              </span>
              {result.costSummary.totalTokens > 0 && (
                <span style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                  {result.costSummary.totalTokens.toLocaleString()} tokens
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {result.plan && (
                <>
                  <button onClick={savePlanAsNode} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    <FloppyDisk size={14} /> 기획서 저장
                  </button>
                  {result.plan.gaps?.length > 0 && (
                    <button onClick={createIssuesFromGaps} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      <GitBranch size={14} /> 이슈 생성 ({result.plan.gaps.length})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Accordion items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'analysis', label: '1. 시나리오 분석', data: result.analysis, stageKey: 'analyze' },
              { key: 'plan', label: '2. 기능 기획', data: result.plan, stageKey: 'plan' },
              { key: 'spec', label: '3. 기술 설계', data: result.spec, stageKey: 'spec' },
              { key: 'implementation', label: '4. 구현 가이드', data: result.implementation, stageKey: 'implement' },
              { key: 'qa', label: '5. QA 검증', data: result.qa, stageKey: 'qa' },
            ].filter(item => item.data).map(item => (
              <div key={item.key} style={{ border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenAccordion(openAccordion === item.key ? null : item.key)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', border: 'none', background: openAccordion === item.key ? '#f8f9fa' : '#fff', cursor: 'pointer', fontSize: 13 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                    {item.key === 'qa' && item.data?.score != null && (
                      <span style={{ background: item.data.score >= 90 ? '#d3f9d8' : item.data.score >= 70 ? '#fff9db' : '#ffe3e3', color: item.data.score >= 90 ? '#2b8a3e' : item.data.score >= 70 ? '#e67700' : '#c92a2a', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                        {item.data.score}점
                      </span>
                    )}
                    {result.costSummary.stages[item.stageKey] && (
                      <span style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                        {result.costSummary.stages[item.stageKey].toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                  <span>{openAccordion === item.key ? '-' : '+'}</span>
                </button>
                {openAccordion === item.key && (
                  <div style={{ padding: '12px 14px', borderTop: '1px solid #e0e0e0' }}>
                    <StageResult data={item.data} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {result.error && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#fa5252' }}>오류: {result.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** JSON 결과를 보기 좋게 렌더링 */
function StageResult({ data }: { data: any }) {
  if (!data) return <span style={{ fontSize: 12, color: '#868e96' }}>결과 없음</span>;

  if (data.parseError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ background: '#fff9db', padding: '1px 8px', borderRadius: 10, fontSize: 10, width: 'fit-content' }}>JSON 파싱 실패 — 원문 표시</span>
        <pre style={{ fontSize: 12, background: '#f8f9fa', padding: 12, borderRadius: 4, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>{data.raw}</pre>
      </div>
    );
  }

  return (
    <pre style={{ fontSize: 12, background: '#f8f9fa', padding: 12, borderRadius: 4, overflow: 'auto', maxHeight: 400, margin: 0, whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
