'use client';

import { useState, useEffect } from 'react';
import { Users, Database, Warning, CurrencyDollar, ArrowRight, ClockCounterClockwise, CheckCircle, XCircle, Table, Eye, UserList, FlowArrow, Lightning, Robot, Leaf, Flask, Code } from '@phosphor-icons/react';
import type { ServiceStatus } from '@/lib/utils/check-env';
import { SERVICE_LABELS } from '@/lib/utils/check-env';
import { DataNodeManager } from './DataNodeManager';
import { VerifyQueue } from './VerifyQueue';
import { CostMonitor } from './CostMonitor';
import { AuditLog } from './AuditLog';
import { DBEditor } from './DBEditor';
import { ViewEditor } from './ViewEditor';
import { ViewSettings } from './ViewSettings';
import { MemberManager } from './MemberManager';
import { RoleManager } from './RoleManager';
import { ScenarioGenerator } from './ScenarioGenerator';
import { AgentDashboard } from './AgentDashboard';
import { BonchoManager } from './BonchoManager';
import { BangjeManager } from './BangjeManager';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const UXFlowEditor = dynamic(() => import('./UXFlowEditor').then(m => m.UXFlowEditor), { ssr: false });
const CodeView = dynamic(() => import('@/components/views/CodeView').then(m => m.CodeView), { ssr: false });
const TerminalView = dynamic(() => import('@/components/views/TerminalView').then(m => m.TerminalView), { ssr: false });
const AIDevView = dynamic(() => import('@/components/views/AIDevView').then(m => m.AIDevView), { ssr: false });

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalNodes: number;
    unresolvedCount: number;
    costToday: number;
  };
  serviceStatus: ServiceStatus;
}

function StatCard({ label, value, icon, alert }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#868e96' }}>{label}</span>
        <span style={{ color: '#868e96' }}>{icon}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: alert ? 'red' : undefined }}>{value}</span>
    </div>
  );
}

interface RecentUser {
  id: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

const TAB_ITEMS = [
  { value: 'nodes', label: '데이터 관리', icon: null },
  { value: 'verify', label: '검토 대기', icon: null },
  { value: 'cost', label: '비용 모니터링', icon: null },
  { value: 'audit', label: '감사 로그', icon: null },
  { value: 'db', label: 'DB 에디터', icon: <Table size={14} /> },
  { value: 'views', label: '뷰 관리', icon: <Eye size={14} /> },
  { value: 'members', label: '회원 관리', icon: <UserList size={14} /> },
  { value: 'ux-flow', label: 'UX 플로우', icon: <FlowArrow size={14} /> },
  { value: 'scenarios', label: '시나리오 생성', icon: <Lightning size={14} /> },
  { value: 'agents', label: 'AI 에이전트', icon: <Robot size={14} /> },
  { value: 'boncho', label: '본초DB', icon: <Leaf size={14} /> },
  { value: 'bangje', label: '방제DB', icon: <Flask size={14} /> },
  { value: 'dev', label: '개발', icon: <Code size={14} /> },
];

export function AdminDashboard({ stats, serviceStatus }: AdminDashboardProps) {
  const router = useRouter();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [todaySignups, setTodaySignups] = useState(0);
  const [activeTab, setActiveTab] = useState('nodes');

  useEffect(() => {
    const supabase = createClient();

    // Recent users
    supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setRecentUsers(data ?? []));

    // Today signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .then(({ count }) => setTodaySignups(count ?? 0));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>관리자 패널</h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard
          label="전체 회원"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users size={18} weight="light" />}
        />
        <StatCard
          label="전체 데이터"
          value={stats.totalNodes.toLocaleString()}
          icon={<Database size={18} weight="light" />}
        />
        <StatCard
          label="미확인 항목"
          value={stats.unresolvedCount.toLocaleString()}
          icon={<Warning size={18} weight="light" />}
          alert={stats.unresolvedCount > 100}
        />
        <StatCard
          label="오늘 API 비용"
          value={`$${stats.costToday.toFixed(4)}`}
          icon={<CurrencyDollar size={18} weight="light" />}
          alert={stats.costToday > 10}
        />
      </div>

      {/* Service Status */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, marginTop: 0 }}>서비스 상태</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {(Object.keys(serviceStatus) as Array<keyof ServiceStatus>).map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {serviceStatus[key]
                ? <CheckCircle size={16} weight="fill" color="#40c057" />
                : <XCircle size={16} weight="fill" color="#fa5252" />
              }
              <span style={{ fontSize: 12, color: serviceStatus[key] ? undefined : '#868e96' }}>
                {SERVICE_LABELS[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick info row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {/* Recent Users */}
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>최근 가입 회원</span>
            <span style={{ background: '#f1f3f5', color: '#495057', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>오늘 +{todaySignups}</span>
          </div>
          {recentUsers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#868e96', textAlign: 'center', padding: '16px 0' }}>아직 회원이 없어요.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentUsers.slice(0, 5).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, overflow: 'hidden' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name ?? '?')[0]}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name ?? '이름 없음'}
                    </span>
                    <span style={{ fontSize: 12, color: '#868e96', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#868e96', flexShrink: 0 }}>
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <span style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 16 }}>빠른 작업</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: '새 대화 시작', path: '/chat' },
              { label: '미확인 항목 확인하기', path: '/accuracy' },
              { label: '마켓 관리', path: '/market' },
              { label: '설정', path: '/settings' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 12px', background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                {item.label}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs for detailed management */}
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid #e0e0e0', paddingBottom: 0 }}>
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 13,
                background: activeTab === tab.value ? '#fff' : 'transparent',
                borderBottom: activeTab === tab.value ? '2px solid #333' : '2px solid transparent',
                fontWeight: activeTab === tab.value ? 600 : 400,
                color: activeTab === tab.value ? '#000' : '#868e96',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.value === 'verify' && stats.unresolvedCount > 0 && (
                <span style={{ background: '#fa5252', color: '#fff', padding: '0 6px', borderRadius: 10, fontSize: 10, marginLeft: 4 }}>{stats.unresolvedCount}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ paddingTop: 16 }}>
          {activeTab === 'nodes' && <DataNodeManager />}
          {activeTab === 'verify' && <VerifyQueue />}
          {activeTab === 'cost' && <CostMonitor />}
          {activeTab === 'audit' && <AuditLog />}
          {activeTab === 'db' && <DBEditor />}
          {activeTab === 'views' && <ViewTabContent />}
          {activeTab === 'members' && <MemberTabContent />}
          {activeTab === 'ux-flow' && <UXFlowEditor />}
          {activeTab === 'scenarios' && <ScenarioGenerator />}
          {activeTab === 'agents' && <AgentDashboard />}
          {activeTab === 'boncho' && <BonchoManager />}
          {activeTab === 'bangje' && <BangjeManager />}
          {activeTab === 'dev' && <DevTabContent />}
        </div>
      </div>
    </div>
  );
}

/** 뷰 관리 탭 내부 — SegmentedControl로 편집/설정 전환 */
function ViewTabContent() {
  const [subTab, setSubTab] = useState('editor');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #dee2e6', width: 'fit-content' }}>
        {[{ label: '뷰 편집', value: 'editor' }, { label: '뷰 설정', value: 'settings' }].map(opt => (
          <button
            key={opt.value}
            onClick={() => setSubTab(opt.value)}
            style={{
              padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12,
              background: subTab === opt.value ? '#333' : '#fff',
              color: subTab === opt.value ? '#fff' : '#333',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {subTab === 'editor' ? <ViewEditor /> : <ViewSettings />}
    </div>
  );
}

/** 회원 관리 탭 내부 — SegmentedControl로 회원/권한 전환 */
function MemberTabContent() {
  const [subTab, setSubTab] = useState('members');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #dee2e6', width: 'fit-content' }}>
        {[{ label: '회원 목록', value: 'members' }, { label: '권한 그룹', value: 'roles' }].map(opt => (
          <button
            key={opt.value}
            onClick={() => setSubTab(opt.value)}
            style={{
              padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12,
              background: subTab === opt.value ? '#333' : '#fff',
              color: subTab === opt.value ? '#fff' : '#333',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {subTab === 'members' ? <MemberManager /> : <RoleManager />}
    </div>
  );
}

/** 개발 탭 — 코드 에디터 + 터미널 + AI + 인제스트 */
function DevTabContent() {
  const [subTab, setSubTab] = useState('code');
  const [ingestDir, setIngestDir] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any>(null);
  const emptyNodes: any[] = [];

  const handleIngest = async () => {
    if (!ingestDir.trim() || ingesting) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch('/api/ingest/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: ingestDir.trim() }),
      });
      const data = await res.json();
      setIngestResult(data);
    } catch (e) {
      setIngestResult({ error: 'Network error' });
    }
    setIngesting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 프로젝트 인제스트 */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 8px 0' }}>프로젝트 인제스트</p>
        <p style={{ fontSize: 12, color: '#868e96', margin: '0 0 8px 0' }}>
          폴더 경로를 입력하면 소스 파일을 DataNode로 변환합니다. 파일 간 import 관계가 자동으로 트리플로 추출됩니다.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            placeholder="/Users/.../project/src"
            value={ingestDir}
            onChange={e => setIngestDir(e.target.value)}
            disabled={ingesting}
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
          />
          <button
            onClick={handleIngest}
            disabled={ingesting}
            style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            {ingesting ? '...' : '인제스트'}
          </button>
        </div>
        {ingestResult && (
          <div style={{ marginTop: 8 }}>
            {ingestResult.error ? (
              <span style={{ fontSize: 12, color: 'red' }}>{ingestResult.error}</span>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ background: '#d3f9d8', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>생성 {ingestResult.results?.created}</span>
                <span style={{ background: '#d0ebff', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>업데이트 {ingestResult.results?.updated}</span>
                <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>트리플 {ingestResult.results?.triples}</span>
                <span style={{ background: '#fff9db', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>스킵 {ingestResult.results?.skipped}</span>
                {ingestResult.results?.errors > 0 && (
                  <span style={{ background: '#ffe3e3', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>에러 {ingestResult.results?.errors}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #dee2e6', width: 'fit-content' }}>
        {[{ label: '코드', value: 'code' }, { label: '터미널', value: 'terminal' }, { label: 'AI Dev', value: 'ai' }].map(opt => (
          <button
            key={opt.value}
            onClick={() => setSubTab(opt.value)}
            style={{
              padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12,
              background: subTab === opt.value ? '#333' : '#fff',
              color: subTab === opt.value ? '#fff' : '#333',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ minHeight: 500 }}>
        {subTab === 'code' && <CodeView nodes={emptyNodes} />}
        {subTab === 'terminal' && <TerminalView nodes={emptyNodes} />}
        {subTab === 'ai' && <AIDevView nodes={emptyNodes} />}
      </div>
    </div>
  );
}
