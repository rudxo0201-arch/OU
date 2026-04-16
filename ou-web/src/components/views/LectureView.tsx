'use client';

import { useState, useMemo } from 'react';
import {
  Box, Group, Text, Stack, ScrollArea, Badge,
  ActionIcon, Tooltip, SimpleGrid, Progress, Tabs,
  Divider,
} from '@mantine/core';
import {
  Play, Image, FileText, CaretLeft, CaretRight,
  Plus, DotsSixVertical, Cards, ListNumbers,
} from '@phosphor-icons/react';
import { tripleToSentence } from '@/lib/triples/sentence-templates';
import type { TriplePredicate } from '@/types';

interface LectureViewProps {
  nodes: any[];
  filters?: Record<string, any>;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  contentType: 'text' | 'video' | 'image' | 'mixed';
  content: string;
  mediaUrl?: string;
  nodeId?: string;
}

/**
 * 강의 뷰 (Lecture View)
 * 챕터 기반 강의 제작/열람 뷰
 * - 좌측: 챕터 목록 (드래그 가능)
 * - 우측: 선택된 챕터 콘텐츠
 * - 하단 탭: 콘텐츠 / 퀴즈 / 개요
 */
export function LectureView({ nodes }: LectureViewProps) {
  const [activeTab, setActiveTab] = useState<string | null>('content');
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);

  // 노드들을 챕터로 변환
  const chapters: Chapter[] = useMemo(() => {
    return nodes.map((node, idx) => {
      const dd = node.domain_data ?? {};
      return {
        id: node.id,
        title: dd.title ?? dd.heading ?? node.raw?.slice(0, 40) ?? `챕터 ${idx + 1}`,
        order: dd.order ?? idx,
        contentType: dd.media_type ?? (dd.video_url ? 'video' : dd.image_url ? 'image' : 'text'),
        content: dd.content ?? node.raw ?? '',
        mediaUrl: dd.video_url ?? dd.image_url ?? dd.file_url ?? null,
        nodeId: node.id,
      };
    }).sort((a, b) => a.order - b.order);
  }, [nodes]);

  const currentChapter = chapters[selectedChapterIdx];
  const progress = chapters.length > 0
    ? Math.round(((selectedChapterIdx + 1) / chapters.length) * 100)
    : 0;

  // 노드에서 트리플 기반 퀴즈 생성 (간이)
  const quizItems = useMemo(() => {
    const items: { question: string; answer: string }[] = [];
    for (const node of nodes) {
      const dd = node.domain_data ?? {};
      if (dd.question && dd.answer) {
        items.push({ question: dd.question, answer: dd.answer });
      }
      // 트리플이 있으면 퀴즈 변환
      if (dd.triples && Array.isArray(dd.triples)) {
        for (const t of dd.triples) {
          if (t.subject && t.predicate && t.object) {
            items.push({
              question: tripleToSentence({ subject: t.subject, predicate: t.predicate as TriplePredicate, object: '?' }),
              answer: t.object,
            });
          }
        }
      }
    }
    return items;
  }, [nodes]);

  if (chapters.length === 0) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <ListNumbers size={48} weight="light" color="var(--mantine-color-gray-5)" />
        <Text fz="sm" c="dimmed">강의에 넣을 데이터가 없습니다</Text>
      </Stack>
    );
  }

  return (
    <Box style={{ display: 'flex', height: 500 }}>
      {/* 좌측: 챕터 목록 */}
      <Box
        style={{
          width: 220,
          borderRight: '0.5px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      >
        <Box px="sm" py="xs" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
          <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
            챕터 ({chapters.length})
          </Text>
          <Progress value={progress} size="xs" mt={4} color="gray" />
        </Box>
        <ScrollArea h={440}>
          <Stack gap={0}>
            {chapters.map((ch, idx) => {
              const isActive = idx === selectedChapterIdx;
              const TypeIcon = ch.contentType === 'video' ? Play
                : ch.contentType === 'image' ? Image : FileText;
              return (
                <Group
                  key={ch.id}
                  px="sm"
                  py="xs"
                  gap="xs"
                  wrap="nowrap"
                  onClick={() => setSelectedChapterIdx(idx)}
                  style={{
                    cursor: 'pointer',
                    background: isActive ? 'var(--mantine-color-dark-6)' : 'transparent',
                    borderBottom: '0.5px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Text fz="xs" c="dimmed" w={18} ta="right">{idx + 1}</Text>
                  <TypeIcon size={12} weight="light" />
                  <Text fz="xs" lineClamp={1} style={{ flex: 1 }}>{ch.title}</Text>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea>
      </Box>

      {/* 우측: 콘텐츠 영역 */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 내비게이션 */}
        <Group justify="space-between" px="md" py="xs" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            disabled={selectedChapterIdx === 0}
            onClick={() => setSelectedChapterIdx(i => Math.max(0, i - 1))}
          >
            <CaretLeft size={16} />
          </ActionIcon>
          <Text fz="xs" fw={500}>{currentChapter?.title}</Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            disabled={selectedChapterIdx === chapters.length - 1}
            onClick={() => setSelectedChapterIdx(i => Math.min(chapters.length - 1, i + 1))}
          >
            <CaretRight size={16} />
          </ActionIcon>
        </Group>

        {/* 탭: 콘텐츠 / 퀴즈 / 개요 */}
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" color="gray" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs.List px="md">
            <Tabs.Tab value="content" fz="xs">콘텐츠</Tabs.Tab>
            <Tabs.Tab value="quiz" fz="xs" rightSection={
              quizItems.length > 0 ? <Badge size="xs" variant="light" color="gray">{quizItems.length}</Badge> : null
            }>퀴즈</Tabs.Tab>
            <Tabs.Tab value="overview" fz="xs">개요</Tabs.Tab>
          </Tabs.List>

          {/* 콘텐츠 탭 */}
          <Tabs.Panel value="content" style={{ flex: 1 }}>
            <ScrollArea h={380} p="md">
              {currentChapter?.mediaUrl && (
                <Box
                  mb="md"
                  style={{
                    border: '0.5px solid var(--mantine-color-default-border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    aspectRatio: '16/9',
                    background: 'var(--mantine-color-dark-7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentChapter.contentType === 'video' ? (
                    <video src={currentChapter.mediaUrl} controls style={{ width: '100%', height: '100%' }} />
                  ) : currentChapter.contentType === 'image' ? (
                    <img src={currentChapter.mediaUrl} alt={currentChapter.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <iframe src={currentChapter.mediaUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={currentChapter.title} />
                  )}
                </Box>
              )}
              <Text fz="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {currentChapter?.content || '(내용 없음)'}
              </Text>
            </ScrollArea>
          </Tabs.Panel>

          {/* 퀴즈 탭 */}
          <Tabs.Panel value="quiz" style={{ flex: 1 }}>
            <ScrollArea h={380} p="md">
              {quizItems.length > 0 ? (
                <Stack gap="md">
                  {quizItems.map((q, idx) => (
                    <QuizCard key={idx} index={idx} question={q.question} answer={q.answer} />
                  ))}
                </Stack>
              ) : (
                <Stack align="center" py="xl">
                  <Cards size={48} weight="light" color="var(--mantine-color-gray-5)" />
                  <Text fz="sm" c="dimmed">데이터에서 자동 생성할 퀴즈가 없습니다</Text>
                </Stack>
              )}
            </ScrollArea>
          </Tabs.Panel>

          {/* 개요 탭 */}
          <Tabs.Panel value="overview" style={{ flex: 1 }}>
            <ScrollArea h={380} p="md">
              <Stack gap="xs">
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">전체 챕터</Text>
                {chapters.map((ch, idx) => (
                  <Group
                    key={ch.id}
                    gap="xs"
                    py={4}
                    onClick={() => { setSelectedChapterIdx(idx); setActiveTab('content'); }}
                    style={{ cursor: 'pointer', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
                  >
                    <Text fz="xs" c="dimmed" w={24} ta="right">{idx + 1}</Text>
                    <Badge variant="light" color="gray" size="xs">{ch.contentType}</Badge>
                    <Text fz="sm" style={{ flex: 1 }}>{ch.title}</Text>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Box>
  );
}

/** 간이 퀴즈 카드 */
function QuizCard({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Box
      p="md"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        cursor: 'pointer',
      }}
      onClick={() => setRevealed(r => !r)}
    >
      <Group gap="xs" mb="xs">
        <Badge variant="light" color="gray" size="xs">Q{index + 1}</Badge>
        <Text fz="sm" fw={500}>{question}</Text>
      </Group>
      {revealed && (
        <Text fz="sm" c="dimmed" pl={28} style={{ lineHeight: 1.6 }}>
          {answer}
        </Text>
      )}
      {!revealed && (
        <Text fz="xs" c="dimmed" pl={28}>눌러서 답 확인</Text>
      )}
    </Box>
  );
}
