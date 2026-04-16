'use client';

import { useState } from 'react';
import {
  Lightning, Clock, MagnifyingGlass, Database, HashStraight,
  Eye, FileText, ShareNetwork, Bell, Robot, Globe,
  ArrowRight, Check,
} from '@phosphor-icons/react';

// ─── Types ──────────────────────────────────────────────────

interface TriggerConfig {
  type: string;
  config: Record<string, unknown>;
}

interface ActionConfig {
  type: string;
  config: Record<string, unknown>;
}

interface AutomationBuilderProps {
  initialData?: {
    name?: string;
    trigger?: TriggerConfig;
    actions?: ActionConfig[];
    enabled?: boolean;
  };
  onSave: (data: {
    name: string;
    trigger: TriggerConfig;
    actions: ActionConfig[];
    enabled: boolean;
  }) => void;
  onCancel: () => void;
}

// ─── Trigger/Action Definitions ─────────────────────────────

const TRIGGER_OPTIONS = [
  { type: 'node_created', label: '데이터 생성 시', description: '새로운 데이터가 만들어지면 실행', icon: Lightning },
  { type: 'schedule', label: '예약 실행', description: '정해진 시간에 자동 실행', icon: Clock },
  { type: 'keyword', label: '키워드 감지', description: '특정 키워드가 포함되면 실행', icon: MagnifyingGlass },
  { type: 'domain_match', label: '도메인 일치', description: '특정 분야의 데이터가 들어오면 실행', icon: Database },
  { type: 'count_threshold', label: '개수 도달', description: '데이터가 정해진 개수에 도달하면 실행', icon: HashStraight },
];

const ACTION_OPTIONS = [
  { type: 'run_llm', label: 'AI 처리', description: 'AI가 데이터를 분석하거나 변환', icon: Robot },
  { type: 'create_view', label: '뷰 생성', description: '데이터를 특정 형식으로 정리', icon: Eye },
  { type: 'export_document', label: '문서 내보내기', description: '마크다운, PDF 등으로 저장', icon: FileText },
  { type: 'post_social', label: 'SNS 포스트', description: '인스타그램, 스레드 등에 올릴 글 생성', icon: ShareNetwork },
  { type: 'send_notification', label: '알림 보내기', description: '자동으로 알림 전송', icon: Bell },
  { type: 'webhook', label: '외부 연결', description: '다른 서비스에 데이터 전송', icon: Globe },
];

const STEPS = ['조건', '조건 설정', '실행 작업', '작업 설정', '이름'];

// ─── Component ──────────────────────────────────────────────

export function AutomationBuilder({ initialData, onSave, onCancel }: AutomationBuilderProps) {
  const [active, setActive] = useState(0);
  const [name, setName] = useState(initialData?.name ?? '');
  const [trigger, setTrigger] = useState<TriggerConfig>(initialData?.trigger ?? { type: '', config: {} });
  const [actions, setActions] = useState<ActionConfig[]>(initialData?.actions ?? []);
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);

  const canNext = () => {
    switch (active) {
      case 0: return !!trigger.type;
      case 1: return true;
      case 2: return actions.length > 0;
      case 3: return true;
      case 4: return name.trim().length > 0;
      default: return false;
    }
  };

  const handleSave = () => {
    onSave({ name: name.trim(), trigger, actions, enabled });
  };

  const cardStyle = (selected: boolean): React.CSSProperties => ({
    padding: 16,
    borderRadius: 8,
    border: `1px solid ${selected ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-dark-6)'}`,
    background: selected ? 'var(--mantine-color-dark-7)' : 'transparent',
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 20, borderRadius: 'var(--mantine-radius-md)', border: '0.5px solid var(--mantine-color-default-border)' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((step, i) => (
          <div key={i} onClick={() => i <= active && setActive(i)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: i <= active ? 'pointer' : 'default', opacity: i <= active ? 1 : 0.4 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < active ? 'var(--mantine-color-gray-6)' : i === active ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-dark-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white' }}>
              {i < active ? <Check size={10} /> : i + 1}
            </div>
            <span style={{ fontSize: 11 }}>{step}</span>
            {i < STEPS.length - 1 && <span style={{ color: 'var(--mantine-color-dimmed)' }}>—</span>}
          </div>
        ))}
      </div>

      {/* Step 0: 트리거 선택 */}
      {active === 0 && (
        <div>
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 16 }}>어떤 상황에서 자동화를 실행할까요?</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TRIGGER_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const selected = trigger.type === opt.type;
              return (
                <div key={opt.type} onClick={() => setTrigger({ type: opt.type, config: {} })} style={cardStyle(selected)}>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Icon size={24} weight={selected ? 'fill' : 'light'} />
                    <div>
                      <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, display: 'block' }}>{opt.label}</span>
                      <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{opt.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: 트리거 설정 */}
      {active === 1 && <TriggerConfigForm trigger={trigger} onChange={setTrigger} />}

      {/* Step 2: 액션 선택 */}
      {active === 2 && (
        <div>
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 16 }}>자동으로 실행할 작업을 선택하세요.</span>
          {actions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {actions.map((a, i) => {
                const opt = ACTION_OPTIONS.find(o => o.type === a.type);
                const Icon = opt?.icon ?? Lightning;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, padding: 8, borderRadius: 4, border: '0.5px solid var(--mantine-color-dark-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon size={16} /> <span style={{ fontSize: 'var(--mantine-font-size-sm)' }}>{opt?.label ?? a.type}</span>
                    </div>
                    <button onClick={() => setActions(actions.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-xs)' }}>제거</button>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ACTION_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <div key={opt.type} onClick={() => setActions([...actions, { type: opt.type, config: {} }])} style={cardStyle(false)}>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Icon size={24} weight="light" />
                    <div>
                      <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, display: 'block' }}>{opt.label}</span>
                      <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{opt.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: 액션 설정 */}
      {active === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {actions.map((action, i) => (
            <div key={i}>
              <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                {ACTION_OPTIONS.find(o => o.type === action.type)?.label ?? action.type}
              </span>
              <ActionConfigForm action={action} onChange={updated => { const next = [...actions]; next[i] = updated; setActions(next); }} />
            </div>
          ))}
          {actions.length === 0 && <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>선택된 작업이 없습니다.</span>}
        </div>
      )}

      {/* Step 4: 이름 + 저장 */}
      {active === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, marginBottom: 4 }}>자동화 이름</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 새 시나리오 → 인스타 포스트" style={{ width: '100%', padding: '10px 12px', fontSize: 'var(--mantine-font-size-md)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--mantine-font-size-sm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} /> 활성화
          </label>
        </div>
      )}

      {/* Step 5: 완료 */}
      {active === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 16 }}>
          <Check size={48} weight="bold" />
          <span style={{ fontSize: 'var(--mantine-font-size-lg)', fontWeight: 600 }}>자동화가 준비되었습니다</span>
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>&quot;{name}&quot;</span>
        </div>
      )}

      {/* 내비게이션 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button onClick={active === 0 ? onCancel : () => setActive(active - 1)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mantine-color-dimmed)' }}>
          {active === 0 ? '취소' : '이전'}
        </button>
        {active < 5 ? (
          <button onClick={() => setActive(active + 1)} disabled={!canNext()} style={{ padding: '8px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: !canNext() ? 'not-allowed' : 'pointer', opacity: !canNext() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, color: 'inherit' }}>
            다음 <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleSave} style={{ padding: '8px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: 'inherit' }}>
            저장
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Trigger Config Form ────────────────────────────────────

function TriggerConfigForm({ trigger, onChange }: { trigger: TriggerConfig; onChange: (t: TriggerConfig) => void }) {
  const update = (config: Record<string, unknown>) => onChange({ ...trigger, config: { ...trigger.config, ...config } });
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit' };

  switch (trigger.type) {
    case 'node_created':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>도메인 (선택)</label><input placeholder="예: knowledge, health" value={(trigger.config.domain as string) ?? ''} onChange={e => update({ domain: e.target.value || undefined })} style={inputStyle} /></div>
        </div>
      );
    case 'schedule':
      return (
        <div>
          <label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>실행 주기</label>
          <select value={(trigger.config.cron as string) ?? ''} onChange={e => update({ cron: e.target.value })} style={inputStyle}>
            <option value="">선택하세요</option>
            <option value="0 9 * * *">매일 오전 9시</option>
            <option value="0 9 * * 1">매주 월요일 오전 9시</option>
            <option value="0 0 1 * *">매월 1일</option>
            <option value="0 */6 * * *">6시간마다</option>
          </select>
        </div>
      );
    case 'keyword':
      return (
        <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>키워드 (쉼표로 구분)</label><input placeholder="감지할 키워드" value={((trigger.config.keywords as string[]) ?? []).join(', ')} onChange={e => update({ keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={inputStyle} /></div>
      );
    case 'domain_match':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>도메인</label><input placeholder="예: knowledge" value={(trigger.config.domain as string) ?? ''} onChange={e => update({ domain: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>최소 개수</label><input type="number" min={1} value={(trigger.config.minCount as number) ?? 1} onChange={e => update({ minCount: Number(e.target.value) })} style={inputStyle} /></div>
        </div>
      );
    case 'count_threshold':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>도메인</label><input placeholder="예: knowledge" value={(trigger.config.domain as string) ?? ''} onChange={e => update({ domain: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>도달 개수</label><input type="number" min={1} value={(trigger.config.count as number) ?? 10} onChange={e => update({ count: Number(e.target.value) })} style={inputStyle} /></div>
        </div>
      );
    default:
      return <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>먼저 조건을 선택해주세요.</span>;
  }
}

// ─── Action Config Form ─────────────────────────────────────

function ActionConfigForm({ action, onChange }: { action: ActionConfig; onChange: (a: ActionConfig) => void }) {
  const update = (config: Record<string, unknown>) => onChange({ ...action, config: { ...action.config, ...config } });
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit' };

  switch (action.type) {
    case 'create_view':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>뷰 타입</label><select value={(action.config.viewType as string) ?? ''} onChange={e => update({ viewType: e.target.value })} style={inputStyle}><option value="">선택하세요</option><option value="list">목록</option><option value="graph">그래프</option><option value="table">표</option><option value="timeline">타임라인</option></select></div>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>뷰 이름 (선택)</label><input placeholder="자동 생성 뷰" value={(action.config.name as string) ?? ''} onChange={e => update({ name: e.target.value })} style={inputStyle} /></div>
        </div>
      );
    case 'export_document':
      return (<div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>파일 형식</label><select value={(action.config.format as string) ?? 'md'} onChange={e => update({ format: e.target.value })} style={inputStyle}><option value="md">마크다운 (.md)</option><option value="txt">텍스트 (.txt)</option><option value="pdf">PDF (.pdf)</option></select></div>);
    case 'post_social':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>플랫폼</label><select value={(action.config.platform as string) ?? ''} onChange={e => update({ platform: e.target.value })} style={inputStyle}><option value="">선택하세요</option><option value="instagram">인스타그램</option><option value="threads">스레드</option><option value="twitter">X (트위터)</option></select></div>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>템플릿</label><input placeholder="{llm_output}" value={(action.config.template as string) ?? '{llm_output}'} onChange={e => update({ template: e.target.value })} style={inputStyle} /></div>
        </div>
      );
    case 'send_notification':
      return (<div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>알림 내용</label><input placeholder="{title}에 대한 자동화 완료" value={(action.config.message as string) ?? ''} onChange={e => update({ message: e.target.value })} style={inputStyle} /></div>);
    case 'run_llm':
      return (<div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>AI에게 보낼 지시</label><textarea placeholder="예: 이 내용을 요약해줘" rows={3} value={(action.config.prompt as string) ?? ''} onChange={e => update({ prompt: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>);
    case 'webhook':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>URL</label><input placeholder="https://example.com/webhook" value={(action.config.url as string) ?? ''} onChange={e => update({ url: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', marginBottom: 2 }}>HTTP 메서드</label><select value={(action.config.method as string) ?? 'POST'} onChange={e => update({ method: e.target.value })} style={inputStyle}><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option></select></div>
        </div>
      );
    default:
      return null;
  }
}
