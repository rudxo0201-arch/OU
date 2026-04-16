'use client';

import { useState } from 'react';
import { Lightning, FloppyDisk, Eye, Sparkle } from '@phosphor-icons/react';

const ALL_ARCHETYPES = [
  '의대생', '프리랜서', '신혼부부', '은퇴자', '뮤지션', '자취생',
  '고3 수험생', '스타트업 대표', '교환학생', '워킹맘', '대학 새내기',
  '요리사', '유튜버', '간호사', '변호사',
];

interface GeneratedScenario {
  title: string;
  story: string;
  tags: string[];
}

export function ScenarioGenerator() {
  const [selected, setSelected] = useState<string[]>([
    '의대생', '신혼부부', '워킹맘',
  ]);
  const [count, setCount] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scenarios, setScenarios] = useState<GeneratedScenario[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const toggle = (arch: string) => {
    setSelected(prev =>
      prev.includes(arch) ? prev.filter(a => a !== arch) : [...prev, arch],
    );
  };

  const selectAll = () => setSelected([...ALL_ARCHETYPES]);
  const deselectAll = () => setSelected([]);

  const generate = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setScenarios([]);
    setResult(null);

    try {
      const res = await fetch('/api/admin/generate-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archetypes: selected, count, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`오류: ${data.error}`);
        return;
      }
      setScenarios(data.scenarios ?? []);
    } catch (e: any) {
      setResult(`요청 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/generate-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archetypes: selected, count, preview: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`오류: ${data.error}`);
        return;
      }
      setResult(data.message);
    } catch (e: any) {
      setResult(`저장 실패: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>아키타입 선택</span>
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={selectAll} style={{ padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#868e96' }}>전체 선택</button>
          <button onClick={deselectAll} style={{ padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#868e96' }}>전체 해제</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {ALL_ARCHETYPES.map(arch => (
            <label key={arch} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.includes(arch)}
                onChange={() => toggle(arch)}
              />
              {arch}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>아키타입당 생성 수</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 2)}
            min={1}
            max={10}
            style={{ width: 160, padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#868e96', paddingBottom: 6 }}>
          예상: {selected.length * count}개 시나리오
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={generate}
          disabled={loading || selected.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: loading || selected.length === 0 ? 'default' : 'pointer', fontSize: 12, opacity: loading || selected.length === 0 ? 0.5 : 1 }}
        >
          {loading ? '...' : <Eye size={14} />}
          {loading ? '생성 중...' : '미리보기'}
        </button>
        <button
          onClick={save}
          disabled={saving || selected.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: saving || selected.length === 0 ? 'default' : 'pointer', fontSize: 12, opacity: saving || selected.length === 0 ? 0.5 : 1 }}
        >
          {saving ? '...' : <FloppyDisk size={14} />}
          {saving ? '저장 중...' : '바로 생성 + 저장'}
        </button>
      </div>

      {/* Preview */}
      {scenarios.length > 0 && (
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkle size={16} weight="fill" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>미리보기 ({scenarios.length}개)</span>
          </div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenarios.map((s, i) => (
                <div key={i} style={{ padding: 8, border: '1px solid #e0e0e0', borderRadius: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>{s.title}</span>
                  <span style={{ fontSize: 13, color: '#868e96', display: 'block', marginBottom: 8 }}>{s.story}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {s.tags.map(tag => (
                      <span key={tag} style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'default' : 'pointer', fontSize: 12 }}
            >
              {saving ? '...' : <FloppyDisk size={14} />}
              {saving ? '저장 중...' : '이 시나리오들 저장'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: 13 }}>{result}</span>
        </div>
      )}
    </div>
  );
}
