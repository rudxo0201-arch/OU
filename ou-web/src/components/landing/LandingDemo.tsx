'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Box, Stack, Title, Text, Button, Group, UnstyledButton } from '@mantine/core';
import { CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

/* ──────────────────────────────────────────────
 * Demo nodes — everyday Korean labels
 * ──────────────────────────────────────────────*/
const DEMO_NODES = [
  { id: 1, label: '희민 생일', size: 7, importance: 3 },
  { id: 2, label: '경제학 시험', size: 8, importance: 3 },
  { id: 3, label: '오늘 점심', size: 6, importance: 2 },
  { id: 4, label: '여행 계획', size: 7, importance: 2 },
  { id: 5, label: '운동 기록', size: 6, importance: 2 },
  { id: 6, label: '아이디어 메모', size: 5, importance: 1 },
  { id: 7, label: '읽을 책', size: 5, importance: 1 },
  { id: 8, label: '프로젝트 회의', size: 7, importance: 3 },
  { id: 9, label: '가계부', size: 5, importance: 1 },
  { id: 10, label: '감사 일기', size: 6, importance: 2 },
];

const DEMO_EDGES: [number, number][] = [
  [1, 4], [2, 8], [3, 10], [4, 5], [6, 7],
  [8, 2], [9, 3], [5, 10], [1, 6], [7, 9],
];

/* ──────────────────────────────────────────────
 * Seeded random for stable SSR/CSR layout
 * ──────────────────────────────────────────────*/
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ──────────────────────────────────────────────
 * DemoGraph — lightweight CSS-animated graph
 * ──────────────────────────────────────────────*/
function DemoGraph() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate stable positions for nodes
  const nodePositions = useMemo(() => {
    const rand = seededRandom(42);
    const padding = 15; // percent from edges
    return DEMO_NODES.map(() => ({
      x: padding + rand() * (100 - padding * 2),
      y: padding + rand() * (100 - padding * 2),
      delay: rand() * 6,
      duration: 8 + rand() * 6,
      dx: (rand() - 0.5) * 20,
      dy: (rand() - 0.5) * 20,
    }));
  }, []);

  return (
    <Box
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* SVG edges */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {DEMO_EDGES.map(([srcIdx, tgtIdx], i) => {
          const src = nodePositions[srcIdx - 1];
          const tgt = nodePositions[tgtIdx - 1];
          return (
            <line
              key={i}
              x1={`${src.x}%`}
              y1={`${src.y}%`}
              x2={`${tgt.x}%`}
              y2={`${tgt.y}%`}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.5"
              className="demo-edge"
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {DEMO_NODES.map((node, i) => {
        const pos = nodePositions[i];
        const glowSize = node.size * 6;
        return (
          <div
            key={node.id}
            className="demo-node"
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              animation: `demoFloat${i % 4} ${pos.duration}s ease-in-out ${pos.delay}s infinite alternate`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              pointerEvents: 'none',
            }}
          >
            {/* Glow */}
            <div
              style={{
                position: 'absolute',
                width: glowSize,
                height: glowSize,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Dot */}
            <div
              style={{
                width: node.size,
                height: node.size,
                borderRadius: '50%',
                background: `rgba(255,255,255,${0.4 + node.importance * 0.15})`,
                boxShadow: `0 0 ${node.size * 2}px rgba(255,255,255,${0.1 + node.importance * 0.05})`,
                position: 'relative',
                zIndex: 1,
                animation: `demoTwinkle ${3 + (i % 3)}s ease-in-out ${pos.delay}s infinite alternate`,
              }}
            />
            {/* Label */}
            <span
              style={{
                fontSize: 11,
                color: `rgba(255,255,255,${0.3 + node.importance * 0.1})`,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.2px',
                position: 'relative',
                zIndex: 1,
                fontWeight: 400,
              }}
            >
              {node.label}
            </span>
          </div>
        );
      })}

      {/* Center glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Keyframe styles */}
      <style>{`
        @keyframes demoFloat0 {
          from { transform: translate(-50%, -50%) translate(0px, 0px); }
          to   { transform: translate(-50%, -50%) translate(8px, -12px); }
        }
        @keyframes demoFloat1 {
          from { transform: translate(-50%, -50%) translate(0px, 0px); }
          to   { transform: translate(-50%, -50%) translate(-10px, 8px); }
        }
        @keyframes demoFloat2 {
          from { transform: translate(-50%, -50%) translate(0px, 0px); }
          to   { transform: translate(-50%, -50%) translate(6px, 10px); }
        }
        @keyframes demoFloat3 {
          from { transform: translate(-50%, -50%) translate(0px, 0px); }
          to   { transform: translate(-50%, -50%) translate(-8px, -6px); }
        }
        @keyframes demoTwinkle {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </Box>
  );
}

/* ──────────────────────────────────────────────
 * LandingDemo — main landing page component
 * ──────────────────────────────────────────────*/
export function LandingDemo() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/login');
  };

  const handleTry = () => {
    router.push('/chat');
  };

  return (
    <>
      {/* ── Desktop Layout (>= 768) ─────────── */}
      <Box
        visibleFrom="sm"
        style={{
          display: 'flex',
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        {/* Left — Graph */}
        <Box
          style={{
            width: '50%',
            height: '100%',
            background: '#060810',
            position: 'relative',
          }}
        >
          <DemoGraph />
          {/* Vignette overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(6,8,16,0.6) 80%)',
              pointerEvents: 'none',
            }}
          />
        </Box>

        {/* Right — CTA */}
        <Box
          style={{
            width: '50%',
            height: '100%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 48,
          }}
        >
          <Stack gap="xl" style={{ maxWidth: 380 }}>
            <Stack gap={4}>
              <Title
                order={1}
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  letterSpacing: '-2px',
                  lineHeight: 1,
                  color: '#000',
                }}
              >
                OU
              </Title>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: 300,
                  color: '#999',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                Just talk.
              </Text>
            </Stack>

            <Text
              style={{
                fontSize: 17,
                color: '#444',
                lineHeight: 1.7,
                fontWeight: 500,
              }}
            >
              말하면, 정리돼요.
            </Text>

            {/* 시나리오 프리필 체험 */}
            <Box
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                border: '1px solid #e0e0e0',
                background: '#fafafa',
              }}
            >
              <Text fz={13} c="#888" mb={8}>이렇게 말해보세요</Text>
              <Text fz={15} fw={500} c="#333" mb={12} style={{ lineHeight: 1.5 }}>
                &ldquo;다음주 금요일 7시 강남역에서 친구 모임&rdquo;
              </Text>
              <Group gap="sm">
                <Button
                  size="sm"
                  variant="filled"
                  color="dark"
                  radius="md"
                  onClick={() => router.push('/chat?scenario=schedule-demo')}
                  styles={{ root: { background: '#000', fontSize: 13, fontWeight: 600, height: 36 } }}
                >
                  이거 보내보기
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  color="gray"
                  radius="md"
                  onClick={handleTry}
                  styles={{ root: { fontSize: 13, height: 36 } }}
                >
                  직접 써보기
                </Button>
              </Group>
            </Box>

            {/* 시나리오 카테고리 */}
            <Group gap="xs" justify="center">
              {[
                { icon: CalendarBlank, label: '일정', id: 'schedule-demo' },
                { icon: CurrencyKrw, label: '가계부', id: 'finance-demo' },
                { icon: CheckSquare, label: '할 일', id: 'task-demo' },
                { icon: SmileyMeh, label: '일기', id: 'emotion-demo' },
              ].map(item => (
                <UnstyledButton
                  key={item.id}
                  onClick={() => router.push(`/chat?scenario=${item.id}`)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: '1px solid #e8e8e8',
                    fontSize: 12,
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 150ms',
                  }}
                >
                  <item.icon size={14} weight="bold" />
                  {item.label}
                </UnstyledButton>
              ))}
            </Group>

            <Button
              size="lg"
              variant="filled"
              color="dark"
              radius="md"
              onClick={handleStart}
              fullWidth
              styles={{
                root: {
                  background: '#000',
                  height: 48,
                  fontSize: 15,
                  fontWeight: 600,
                },
              }}
            >
              무료로 시작하기
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* ── Mobile Layout (< 768) ─────────── */}
      <Box
        hiddenFrom="sm"
        style={{
          height: '100dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top — Graph */}
        <Box
          style={{
            height: '40vh',
            background: '#060810',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <DemoGraph />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, transparent 30%, rgba(6,8,16,0.6) 80%)',
              pointerEvents: 'none',
            }}
          />
        </Box>

        {/* Bottom — CTA */}
        <Box
          style={{
            flex: 1,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Stack gap="lg" style={{ maxWidth: 340, width: '100%' }}>
            <Stack gap={2} align="center">
              <Title
                order={1}
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: '-1.5px',
                  lineHeight: 1,
                  color: '#000',
                }}
              >
                OU
              </Title>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: 300,
                  color: '#999',
                  letterSpacing: '-0.3px',
                }}
              >
                Just talk.
              </Text>
            </Stack>

            <Text ta="center" style={{ fontSize: 15, color: '#444', fontWeight: 500 }}>
              말하면, 정리돼요.
            </Text>

            {/* 시나리오 프리필 */}
            <Box
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #e0e0e0',
                background: '#fafafa',
              }}
            >
              <Text fz={12} c="#888" mb={6}>이렇게 말해보세요</Text>
              <Text fz={14} fw={500} c="#333" mb={10} style={{ lineHeight: 1.5 }}>
                &ldquo;다음주 금요일 7시 강남역에서 친구 모임&rdquo;
              </Text>
              <Group gap="sm">
                <Button
                  size="xs"
                  variant="filled"
                  color="dark"
                  radius="md"
                  onClick={() => router.push('/chat?scenario=schedule-demo')}
                  styles={{ root: { background: '#000', fontSize: 12, fontWeight: 600 } }}
                >
                  이거 보내보기
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  radius="md"
                  onClick={handleTry}
                  styles={{ root: { fontSize: 12 } }}
                >
                  직접 써보기
                </Button>
              </Group>
            </Box>

            {/* 카테고리 */}
            <Group gap={6} justify="center">
              {[
                { icon: CalendarBlank, label: '일정', id: 'schedule-demo' },
                { icon: CurrencyKrw, label: '가계부', id: 'finance-demo' },
                { icon: CheckSquare, label: '할 일', id: 'task-demo' },
                { icon: SmileyMeh, label: '일기', id: 'emotion-demo' },
              ].map(item => (
                <UnstyledButton
                  key={item.id}
                  onClick={() => router.push(`/chat?scenario=${item.id}`)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 16,
                    border: '1px solid #e8e8e8',
                    fontSize: 11,
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <item.icon size={12} weight="bold" />
                  {item.label}
                </UnstyledButton>
              ))}
            </Group>

            <Button
              size="lg"
              variant="filled"
              color="dark"
              radius="md"
              onClick={handleStart}
              fullWidth
              styles={{ root: { background: '#000', height: 44, fontSize: 14, fontWeight: 600 } }}
            >
              무료로 시작하기
            </Button>
          </Stack>
        </Box>
      </Box>
    </>
  );
}
