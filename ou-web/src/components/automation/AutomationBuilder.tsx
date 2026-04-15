'use client';

import { useState } from 'react';
import {
  Stepper, Button, Group, TextInput, Paper, Text,
  Stack, SimpleGrid, UnstyledButton, Select, Textarea,
  NumberInput, TagsInput, Switch, Box, Divider,
} from '@mantine/core';
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
  {
    type: 'node_created',
    label: '데이터 생성 시',
    description: '새로운 데이터가 만들어지면 실행',
    icon: Lightning,
  },
  {
    type: 'schedule',
    label: '예약 실행',
    description: '정해진 시간에 자동 실행',
    icon: Clock,
  },
  {
    type: 'keyword',
    label: '키워드 감지',
    description: '특정 키워드가 포함되면 실행',
    icon: MagnifyingGlass,
  },
  {
    type: 'domain_match',
    label: '도메인 일치',
    description: '특정 분야의 데이터가 들어오면 실행',
    icon: Database,
  },
  {
    type: 'count_threshold',
    label: '개수 도달',
    description: '데이터가 정해진 개수에 도달하면 실행',
    icon: HashStraight,
  },
];

const ACTION_OPTIONS = [
  {
    type: 'run_llm',
    label: 'AI 처리',
    description: 'AI가 데이터를 분석하거나 변환',
    icon: Robot,
  },
  {
    type: 'create_view',
    label: '뷰 생성',
    description: '데이터를 특정 형식으로 정리',
    icon: Eye,
  },
  {
    type: 'export_document',
    label: '문서 내보내기',
    description: '마크다운, PDF 등으로 저장',
    icon: FileText,
  },
  {
    type: 'post_social',
    label: 'SNS 포스트',
    description: '인스타그램, 스레드 등에 올릴 글 생성',
    icon: ShareNetwork,
  },
  {
    type: 'send_notification',
    label: '알림 보내기',
    description: '자동으로 알림 전송',
    icon: Bell,
  },
  {
    type: 'webhook',
    label: '외부 연결',
    description: '다른 서비스에 데이터 전송',
    icon: Globe,
  },
];

// ─── Component ──────────────────────────────────────────────

export function AutomationBuilder({ initialData, onSave, onCancel }: AutomationBuilderProps) {
  const [active, setActive] = useState(0);
  const [name, setName] = useState(initialData?.name ?? '');
  const [trigger, setTrigger] = useState<TriggerConfig>(
    initialData?.trigger ?? { type: '', config: {} },
  );
  const [actions, setActions] = useState<ActionConfig[]>(
    initialData?.actions ?? [],
  );
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);

  const canNext = () => {
    switch (active) {
      case 0: return !!trigger.type;
      case 1: return true; // config is optional
      case 2: return actions.length > 0;
      case 3: return true;
      case 4: return name.trim().length > 0;
      default: return false;
    }
  };

  const handleSave = () => {
    onSave({ name: name.trim(), trigger, actions, enabled });
  };

  return (
    <Paper p="lg" radius="md" withBorder>
      <Stepper
        active={active}
        onStepClick={setActive}
        size="sm"
        color="dark"
        completedIcon={<Check size={16} />}
      >
        {/* Step 0: 트리거 선택 */}
        <Stepper.Step label="조건" description="언제 실행할지">
          <Text fz="sm" c="dimmed" mb="md">
            어떤 상황에서 자동화를 실행할까요?
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {TRIGGER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = trigger.type === opt.type;
              return (
                <UnstyledButton
                  key={opt.type}
                  onClick={() => setTrigger({ type: opt.type, config: {} })}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    border: `1px solid ${selected ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-dark-6)'}`,
                    background: selected ? 'var(--mantine-color-dark-7)' : 'transparent',
                  }}
                >
                  <Group gap="sm">
                    <Icon size={24} weight={selected ? 'fill' : 'light'} />
                    <Stack gap={2}>
                      <Text fz="sm" fw={500}>{opt.label}</Text>
                      <Text fz="xs" c="dimmed">{opt.description}</Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </Stepper.Step>

        {/* Step 1: 트리거 설정 */}
        <Stepper.Step label="조건 설정" description="세부 조건">
          <TriggerConfigForm trigger={trigger} onChange={setTrigger} />
        </Stepper.Step>

        {/* Step 2: 액션 선택 */}
        <Stepper.Step label="실행 작업" description="무엇을 할지">
          <Text fz="sm" c="dimmed" mb="md">
            자동으로 실행할 작업을 선택하세요. 여러 개를 순서대로 연결할 수 있어요.
          </Text>

          {/* Selected actions */}
          {actions.length > 0 && (
            <Stack gap="xs" mb="md">
              {actions.map((a, i) => {
                const opt = ACTION_OPTIONS.find((o) => o.type === a.type);
                const Icon = opt?.icon ?? Lightning;
                return (
                  <Group key={i} gap="xs">
                    <Paper
                      p="xs"
                      radius="sm"
                      withBorder
                      style={{ flex: 1, borderColor: 'var(--mantine-color-dark-4)' }}
                    >
                      <Group gap="xs">
                        <Icon size={16} />
                        <Text fz="sm">{opt?.label ?? a.type}</Text>
                      </Group>
                    </Paper>
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      onClick={() => setActions(actions.filter((_, j) => j !== i))}
                    >
                      제거
                    </Button>
                    {i < actions.length - 1 && (
                      <ArrowRight size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    )}
                  </Group>
                );
              })}
              <Divider my="xs" />
            </Stack>
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {ACTION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <UnstyledButton
                  key={opt.type}
                  onClick={() => setActions([...actions, { type: opt.type, config: {} }])}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid var(--mantine-color-dark-6)',
                  }}
                >
                  <Group gap="sm">
                    <Icon size={24} weight="light" />
                    <Stack gap={2}>
                      <Text fz="sm" fw={500}>{opt.label}</Text>
                      <Text fz="xs" c="dimmed">{opt.description}</Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </Stepper.Step>

        {/* Step 3: 액션 설정 */}
        <Stepper.Step label="작업 설정" description="세부 설정">
          <Stack gap="md">
            {actions.map((action, i) => (
              <Box key={i}>
                <Text fz="sm" fw={500} mb="xs">
                  {ACTION_OPTIONS.find((o) => o.type === action.type)?.label ?? action.type}
                </Text>
                <ActionConfigForm
                  action={action}
                  onChange={(updated) => {
                    const next = [...actions];
                    next[i] = updated;
                    setActions(next);
                  }}
                />
                {i < actions.length - 1 && <Divider my="sm" />}
              </Box>
            ))}
            {actions.length === 0 && (
              <Text fz="sm" c="dimmed">선택된 작업이 없습니다. 이전 단계에서 추가해주세요.</Text>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 4: 이름 + 저장 */}
        <Stepper.Step label="이름" description="저장">
          <Stack gap="md">
            <TextInput
              label="자동화 이름"
              placeholder="예: 새 시나리오 → 인스타 포스트"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              size="md"
            />
            <Group gap="xs">
              <Text fz="sm">활성화</Text>
              <Switch
                checked={enabled}
                onChange={() => setEnabled(!enabled)}
                color="dark"
              />
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack gap="md" align="center" py="xl">
            <Check size={48} weight="bold" />
            <Text fz="lg" fw={600}>자동화가 준비되었습니다</Text>
            <Text fz="sm" c="dimmed">&quot;{name}&quot;</Text>
          </Stack>
        </Stepper.Completed>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button
          variant="subtle"
          color="gray"
          onClick={active === 0 ? onCancel : () => setActive(active - 1)}
        >
          {active === 0 ? '취소' : '이전'}
        </Button>
        {active < 5 ? (
          <Button
            color="dark"
            onClick={() => setActive(active + 1)}
            disabled={!canNext()}
            rightSection={<ArrowRight size={16} />}
          >
            다음
          </Button>
        ) : (
          <Button color="dark" onClick={handleSave}>
            저장
          </Button>
        )}
      </Group>
    </Paper>
  );
}

// ─── Trigger Config Form ────────────────────────────────────

function TriggerConfigForm({
  trigger,
  onChange,
}: {
  trigger: TriggerConfig;
  onChange: (t: TriggerConfig) => void;
}) {
  const update = (config: Record<string, unknown>) =>
    onChange({ ...trigger, config: { ...trigger.config, ...config } });

  switch (trigger.type) {
    case 'node_created':
      return (
        <Stack gap="sm">
          <TextInput
            label="도메인 (선택)"
            placeholder="예: knowledge, health (비우면 모든 도메인)"
            value={(trigger.config.domain as string) ?? ''}
            onChange={(e) => update({ domain: e.currentTarget.value || undefined })}
          />
          <TagsInput
            label="태그 필터 (선택)"
            placeholder="포함해야 할 태그"
            value={(trigger.config.tags as string[]) ?? []}
            onChange={(tags) => update({ tags: tags.length ? tags : undefined })}
          />
        </Stack>
      );

    case 'schedule':
      return (
        <Stack gap="sm">
          <Select
            label="실행 주기"
            data={[
              { value: '0 9 * * *', label: '매일 오전 9시' },
              { value: '0 9 * * 1', label: '매주 월요일 오전 9시' },
              { value: '0 0 1 * *', label: '매월 1일' },
              { value: '0 */6 * * *', label: '6시간마다' },
            ]}
            value={(trigger.config.cron as string) ?? ''}
            onChange={(v) => update({ cron: v })}
            placeholder="선택하세요"
          />
        </Stack>
      );

    case 'keyword':
      return (
        <TagsInput
          label="키워드 목록"
          placeholder="감지할 키워드를 입력하세요"
          value={(trigger.config.keywords as string[]) ?? []}
          onChange={(keywords) => update({ keywords })}
        />
      );

    case 'domain_match':
      return (
        <Stack gap="sm">
          <TextInput
            label="도메인"
            placeholder="예: knowledge"
            value={(trigger.config.domain as string) ?? ''}
            onChange={(e) => update({ domain: e.currentTarget.value })}
          />
          <NumberInput
            label="최소 개수 (선택)"
            placeholder="1"
            value={(trigger.config.minCount as number) ?? 1}
            onChange={(v) => update({ minCount: v })}
            min={1}
          />
        </Stack>
      );

    case 'count_threshold':
      return (
        <Stack gap="sm">
          <TextInput
            label="도메인"
            placeholder="예: knowledge"
            value={(trigger.config.domain as string) ?? ''}
            onChange={(e) => update({ domain: e.currentTarget.value })}
          />
          <NumberInput
            label="도달 개수"
            placeholder="예: 100"
            value={(trigger.config.count as number) ?? 10}
            onChange={(v) => update({ count: v })}
            min={1}
          />
        </Stack>
      );

    default:
      return <Text fz="sm" c="dimmed">먼저 조건을 선택해주세요.</Text>;
  }
}

// ─── Action Config Form ─────────────────────────────────────

function ActionConfigForm({
  action,
  onChange,
}: {
  action: ActionConfig;
  onChange: (a: ActionConfig) => void;
}) {
  const update = (config: Record<string, unknown>) =>
    onChange({ ...action, config: { ...action.config, ...config } });

  switch (action.type) {
    case 'create_view':
      return (
        <Stack gap="sm">
          <Select
            label="뷰 타입"
            data={[
              { value: 'list', label: '목록' },
              { value: 'graph', label: '그래프' },
              { value: 'table', label: '표' },
              { value: 'timeline', label: '타임라인' },
            ]}
            value={(action.config.viewType as string) ?? ''}
            onChange={(v) => update({ viewType: v })}
            placeholder="선택하세요"
          />
          <TextInput
            label="뷰 이름 (선택)"
            placeholder="자동 생성 뷰"
            value={(action.config.name as string) ?? ''}
            onChange={(e) => update({ name: e.currentTarget.value })}
          />
        </Stack>
      );

    case 'export_document':
      return (
        <Select
          label="파일 형식"
          data={[
            { value: 'md', label: '마크다운 (.md)' },
            { value: 'txt', label: '텍스트 (.txt)' },
            { value: 'pdf', label: 'PDF (.pdf)' },
          ]}
          value={(action.config.format as string) ?? 'md'}
          onChange={(v) => update({ format: v })}
        />
      );

    case 'post_social':
      return (
        <Stack gap="sm">
          <Select
            label="플랫폼"
            data={[
              { value: 'instagram', label: '인스타그램' },
              { value: 'threads', label: '스레드' },
              { value: 'twitter', label: 'X (트위터)' },
            ]}
            value={(action.config.platform as string) ?? ''}
            onChange={(v) => update({ platform: v })}
            placeholder="선택하세요"
          />
          <TextInput
            label="템플릿 (선택)"
            placeholder="{llm_output} — AI 처리 결과가 들어갑니다"
            value={(action.config.template as string) ?? '{llm_output}'}
            onChange={(e) => update({ template: e.currentTarget.value })}
          />
        </Stack>
      );

    case 'send_notification':
      return (
        <TextInput
          label="알림 내용"
          placeholder="{title}에 대한 자동화가 완료되었습니다"
          value={(action.config.message as string) ?? ''}
          onChange={(e) => update({ message: e.currentTarget.value })}
        />
      );

    case 'run_llm':
      return (
        <Textarea
          label="AI에게 보낼 지시"
          placeholder="예: 이 내용을 요약해줘"
          value={(action.config.prompt as string) ?? ''}
          onChange={(e) => update({ prompt: e.currentTarget.value })}
          minRows={3}
          autosize
        />
      );

    case 'webhook':
      return (
        <Stack gap="sm">
          <TextInput
            label="URL"
            placeholder="https://example.com/webhook"
            value={(action.config.url as string) ?? ''}
            onChange={(e) => update({ url: e.currentTarget.value })}
          />
          <Select
            label="HTTP 메서드"
            data={['POST', 'PUT', 'PATCH']}
            value={(action.config.method as string) ?? 'POST'}
            onChange={(v) => update({ method: v })}
          />
        </Stack>
      );

    default:
      return null;
  }
}
