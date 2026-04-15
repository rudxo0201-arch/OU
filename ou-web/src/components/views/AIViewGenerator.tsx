'use client';

import { useState } from 'react';
import { Stack, Textarea, Button, Text, Box, Group } from '@mantine/core';
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
    <Stack gap="md">
      <Textarea
        label="어떤 뷰를 만들까요?"
        placeholder="내 독서 기록을 책장 스타일로 보여줘. 읽은 책은 세워서, 안 읽은 건 눕혀서."
        minRows={3}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />

      <Button
        loading={loading}
        onClick={handleGenerate}
        disabled={!prompt.trim()}
      >
        {generatedCode ? '수정하기' : 'AI로 만들기'}
      </Button>

      {generatedCode && (
        <Stack gap="sm">
          <Text fz="xs" c="dimmed">미리보기</Text>
          <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
            <iframe
              srcDoc={injectOUData(generatedCode, nodes)}
              style={{ width: '100%', height: 400, border: 'none' }}
              sandbox="allow-scripts"
              title="AI 뷰 미리보기"
            />
          </Box>
          <Group>
            <Button variant="light" onClick={handleSave}>저장하기</Button>
            <Button variant="subtle" color="gray" onClick={handleGenerate} loading={loading}>
              다시 생성
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
