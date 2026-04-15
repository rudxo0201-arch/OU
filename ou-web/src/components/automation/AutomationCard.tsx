'use client';

import {
  Paper, Group, Text, Switch, Badge, Stack,
  ActionIcon, Menu,
} from '@mantine/core';
import {
  DotsThree, Play, PencilSimple, Trash,
  Lightning, Clock, MagnifyingGlass, Database, HashStraight,
  Eye, FileText, ShareNetwork, Bell, Robot, Globe,
} from '@phosphor-icons/react';

// ─── Labels ─────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  node_created: { label: '데이터 생성 시', icon: Lightning },
  schedule:     { label: '예약 실행',     icon: Clock },
  keyword:      { label: '키워드 감지',   icon: MagnifyingGlass },
  domain_match: { label: '도메인 일치',   icon: Database },
  count_threshold: { label: '개수 도달', icon: HashStraight },
};

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  create_view:       { label: '뷰 생성',    icon: Eye },
  export_document:   { label: '문서 내보내기', icon: FileText },
  post_social:       { label: 'SNS 포스트',  icon: ShareNetwork },
  send_notification: { label: '알림 보내기',  icon: Bell },
  run_llm:           { label: 'AI 처리',     icon: Robot },
  webhook:           { label: '웹훅 호출',   icon: Globe },
};

// ─── Types ──────────────────────────────────────────────────

interface AutomationNodeData {
  id: string;
  title: string;
  domain_data: {
    trigger?: { type: string; config?: Record<string, unknown> };
    actions?: { type: string; config?: Record<string, unknown> }[];
    enabled?: boolean;
    lastRunAt?: string;
    lastRunStatus?: string;
    lastRunError?: string;
  };
}

interface AutomationCardProps {
  automation: AutomationNodeData;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

export function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onRun,
}: AutomationCardProps) {
  const dd = automation.domain_data;
  const enabled = dd.enabled ?? false;
  const triggerType = dd.trigger?.type ?? 'node_created';
  const actions = dd.actions ?? [];

  const triggerInfo = TRIGGER_LABELS[triggerType] ?? { label: triggerType, icon: Lightning };
  const TriggerIcon = triggerInfo.icon;

  const lastRun = dd.lastRunAt
    ? new Date(dd.lastRunAt).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{
        borderColor: enabled
          ? 'var(--mantine-color-dark-4)'
          : 'var(--mantine-color-dark-6)',
        opacity: enabled ? 1 : 0.6,
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text fw={600} fz="md" truncate>
              {automation.title}
            </Text>
          </Group>

          <Group gap="xs">
            <Badge
              variant="light"
              color="gray"
              size="sm"
              leftSection={<TriggerIcon size={12} />}
            >
              {triggerInfo.label}
            </Badge>

            {actions.map((action, i) => {
              const info = ACTION_LABELS[action.type] ?? { label: action.type, icon: Lightning };
              const ActionIcon_ = info.icon;
              return (
                <Badge
                  key={i}
                  variant="dot"
                  color="gray"
                  size="sm"
                  leftSection={<ActionIcon_ size={12} />}
                >
                  {info.label}
                </Badge>
              );
            })}
          </Group>

          {lastRun && (
            <Text fz="xs" c="dimmed">
              마지막 실행: {lastRun}
              {dd.lastRunStatus === 'error' && (
                <Text span c="red" fz="xs" ml={4}>
                  (실패)
                </Text>
              )}
            </Text>
          )}
        </Stack>

        <Group gap="xs" wrap="nowrap">
          <Switch
            checked={enabled}
            onChange={() => onToggle(automation.id, !enabled)}
            size="md"
            color="dark"
          />

          <Menu position="bottom-end" withArrow>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <DotsThree size={20} weight="bold" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<Play size={16} />}
                onClick={() => onRun(automation.id)}
              >
                지금 실행
              </Menu.Item>
              <Menu.Item
                leftSection={<PencilSimple size={16} />}
                onClick={() => onEdit(automation.id)}
              >
                수정
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<Trash size={16} />}
                onClick={() => onDelete(automation.id)}
              >
                삭제
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}
