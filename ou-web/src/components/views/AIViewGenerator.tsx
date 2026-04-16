'use client';

import { useState } from 'react';
import { confirmViewGeneration } from '@/lib/token/guard';
import { useNavigationStore } from '@/stores/navigationStore';

interface DataNode {
  id: string;
  domain: string;
  raw?: string;
  [key: string]: unknown;
}

interface AIViewGeneratorProps {
  nodes: DataNode[];
}

function injectOUData(html: string, nodes: DataNode[]): string {
  const script = `<script>window.OU = { nodes: ${JSON.stringify(nodes)} };<\/script>`;
  if (html.includes('<body>')) {
    return html.replace('<body>', `<body>${script}`);
  }
  return script + html;
}

export function AIViewGenerator({ nodes }: AIViewGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { addSavedView } = useNavigationStore();

  const handleGenerate = () => {
    confirmViewGeneration(20, async () => {
      setLoading(true);
      const res = await fetch('/api/views/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, nodes, existingCode: generatedCode || undefined }),
      });

      if (res.status === 403) {
        alert('AI 뷰 생성은 Pro 플랜에서 사용할 수 있어요.');
        setLoading(false);
        return;
      }

      const { code } = await res.json();
      setGeneratedCode(code);
      setLoading(false);
    });
  };

  const handleSave = async () => {
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prompt.slice(0, 30),
        viewType: 'custom',
        customCode: generatedCode,
      }),
    });
    if (!res.ok) return;
    const { view } = await res.json();
    addSavedView({ id: view.id, name: view.name, viewType: 'custom' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, marginBottom: 4 }}>어떤 뷰를 만들까요?</label>
        <textarea
          placeholder="내 독서 기록을 책장 스타일로 보여줘. 읽은 책은 세워서, 안 읽은 건 눕혀서."
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ width: '100%', padding: 8, fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit', resize: 'vertical' }}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        style={{
          padding: '8px 16px',
          border: '0.5px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-md)',
          background: 'rgba(255,255,255,0.06)',
          cursor: !prompt.trim() || loading ? 'not-allowed' : 'pointer',
          opacity: !prompt.trim() || loading ? 0.5 : 1,
          color: 'inherit',
        }}
      >
        {loading ? '생성 중...' : generatedCode ? '수정하기' : 'AI로 만들기'}
      </button>

      {generatedCode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>미리보기</span>
          <div style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
            <iframe
              srcDoc={injectOUData(generatedCode, nodes)}
              style={{ width: '100%', height: 400, border: 'none' }}
              sandbox="allow-scripts"
              title="AI 뷰 미리보기"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{ padding: '6px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: 'inherit' }}
            >
              저장하기
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ padding: '6px 16px', background: 'transparent', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--mantine-color-dimmed)' }}
            >
              {loading ? '생성 중...' : '다시 생성'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
