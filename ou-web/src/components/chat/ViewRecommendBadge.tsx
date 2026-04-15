'use client';

import { Paper, Group, Text, Button, Box } from '@mantine/core';
import { useState } from 'react';
import { CalendarBlank, ChartBar, Graph, ListChecks, ArrowRight } from '@phosphor-icons/react';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { useNavigationStore } from '@/stores/navigationStore';

interface ViewRecommendBadgeProps {
  domain: string;
  viewType: string;
  nodes: any[];
}

const VIEW_CONFIG: Record<string, { icon: React.ElementType; copy: string; label: string }> = {
  calendar: {
    icon: CalendarBlank,
    copy: '일정이 꽤 쌓였네요. 캘린더로 한눈에 볼까요?',
    label: '캘린더',
  },
  task: {
    icon: ListChecks,
    copy: '할 일이 쌓이고 있어요. 칸반으로 정리해볼까요?',
    label: '칸반',
  },
  knowledge_graph: {
    icon: Graph,
    copy: '지식이 많이 쌓였어요. 연결 관계를 볼까요?',
    label: '그래프',
  },
  chart: {
    icon: ChartBar,
    copy: '지출 내역이 쌓였네요. 차트로 정리해볼까요?',
    label: '차트',
  },
};

export function ViewRecommendBadge({ domain, viewType, nodes }: ViewRecommendBadgeProps) {
  const [shown, setShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { addSavedView } = useNavigationStore();

  const config = VIEW_CONFIG[viewType] ?? {
    icon: Graph,
    copy: '데이터가 쌓였어요. 뷰로 볼까요?',
    label: '뷰',
  };
  const Icon = config.icon;

  const handleSave = () => {
    addSavedView({
      id: `${domain}-${Date.now()}`,
      name: `${config.label} 뷰`,
      viewType,
    });
    setSaved(true);
  };

  if (dismissed) return null;

  if (saved) {
    return (
      <Text fz="sm" c="dimmed" py="xs">
        뷰가 저장됐어요. 내 우주에서 확인할 수 있어요.
      </Text>
    );
  }

  return (
    <Paper
      p="sm"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        background: 'var(--mantine-color-body)',
      }}
    >
      <Group gap="sm" mb={shown ? 'sm' : 0} wrap="nowrap">
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} weight="bold" />
        </Box>
        <Text fz="sm" style={{ flex: 1 }}>{config.copy}</Text>
        <Group gap="xs" wrap="nowrap">
          {!shown && (
            <Button
              size="xs"
              variant="filled"
              color="dark"
              rightSection={<ArrowRight size={12} />}
              onClick={() => setShown(true)}
            >
              보기
            </Button>
          )}
          {shown && (
            <Button size="xs" variant="filled" color="dark" onClick={handleSave}>
              저장하기
            </Button>
          )}
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => setDismissed(true)}
          >
            괜찮아요
          </Button>
        </Group>
      </Group>
      {shown && <ViewRenderer viewType={viewType} nodes={nodes} inline />}
    </Paper>
  );
}
