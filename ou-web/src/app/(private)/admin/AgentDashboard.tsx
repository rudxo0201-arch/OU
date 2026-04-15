'use client';

import { useState } from 'react';
import {
  Stack, Text, Paper, Group, Badge, Button, Textarea,
  Select, Accordion, Loader, Code, Box, SimpleGrid,
} from '@mantine/core';
import { Robot, Play, Stop, FloppyDisk, GitBranch } from '@phosphor-icons/react';

/** Agent definitions (client-side mirror of registry) */
const AGENTS = [
  { id: 'scenario-analyzer', nameKo: '시나리오 분석', model: 'haiku', description: '시나리오에서 필요한 기능/도메인/뷰/도구를 분석' },
  { id: 'feature-planner', nameKo: '기능 기획', model: 'haiku', description: '신규 기능 vs 기존 기능, 갭 도출' },
  { id: 'spec-designer', nameKo: '설계', model: 'sonnet', description: '컴포넌트/API/데이터 모델 설계' },
  { id: 'implementation-advisor', nameKo: '구현 가이드', model: 'sonnet', description: '파일 변경, 구현 순서, 테스트 케이스 제안' },
  { id: 'qa-agent', nameKo: 'QA 검증', model: 'haiku', description: '시나리오 대비 구현 검증 및 점수' },
];

type PipelineStage = 'analyze' | 'plan' | 'spec' | 'implement' | 'qa';

const STAGE_OPTIONS: Array<{ value: PipelineStage | 'all'; label: string }> = [
  { value: 'analyze', label: '분석까지' },
  { value: 'plan', label: '기획까지' },
  { value: 'spec', label: '설계까지' },
  { value: 'implement', label: '구현 가이드까지' },
  { value: 'all', label: '전체 (QA 포함)' },
];

interface PipelineResult {
  scenarioId: string;
  scenarioText: string;
  analysis: any;
  plan: any;
  spec: any;
  implementation: any;
  qa: any;
  status: 'complete' | 'partial' | 'failed';
  error?: string;
  stoppedAt?: string;
  costSummary: { totalTokens: number; stages: Record<string, number> };
}

export function AgentDashboard() {
  const [scenarioText, setScenarioText] = useState('');
  const [stopAfter, setStopAfter] = useState<string>('all');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = async () => {
    if (!scenarioText.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const body: any = { scenarioText: scenarioText.trim() };
      if (stopAfter !== 'all') {
        body.stopAfter = stopAfter;
      }

      const res = await fetch('/api/admin/agents/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: PipelineResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Pipeline execution failed');
    } finally {
      setRunning(false);
    }
  };

  const savePlanAsNode = async () => {
    if (!result?.plan) return;
    // TODO: POST to data_nodes API to save as DataNode
    alert('기획서가 DataNode로 저장되었습니다. (구현 예정)');
  };

  const createIssuesFromGaps = async () => {
    if (!result?.plan?.gaps?.length) return;
    // TODO: Create task DataNodes from gaps
    alert(`${result.plan.gaps.length}개 이슈가 생성되었습니다. (구현 예정)`);
  };

  return (
    <Stack gap="lg">
      {/* Agent Registry */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="md">등록된 에이전트</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {AGENTS.map(agent => (
            <Paper key={agent.id} p="sm" withBorder>
              <Group gap="xs" mb={4}>
                <Robot size={16} weight="light" />
                <Text fz="sm" fw={500}>{agent.nameKo}</Text>
                <Badge size="xs" variant="light" color={agent.model === 'sonnet' ? 'dark' : 'gray'}>
                  {agent.model}
                </Badge>
              </Group>
              <Text fz="xs" c="dimmed">{agent.description}</Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Paper>

      {/* Pipeline Runner */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="md">시나리오 파이프라인 실행</Text>
        <Stack gap="sm">
          <Textarea
            placeholder="시나리오 텍스트를 입력하세요..."
            minRows={4}
            maxRows={10}
            autosize
            value={scenarioText}
            onChange={(e) => setScenarioText(e.currentTarget.value)}
            disabled={running}
          />

          <Group gap="sm">
            <Select
              data={STAGE_OPTIONS}
              value={stopAfter}
              onChange={(v) => setStopAfter(v ?? 'all')}
              size="xs"
              w={160}
              disabled={running}
            />
            <Button
              leftSection={running ? <Loader size={14} /> : <Play size={14} weight="fill" />}
              onClick={runPipeline}
              disabled={running || !scenarioText.trim()}
              size="xs"
              color="dark"
            >
              {running ? '실행 중...' : '파이프라인 실행'}
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Paper p="md" bg="var(--mantine-color-red-0)">
          <Text fz="sm" c="red">{error}</Text>
        </Paper>
      )}

      {/* Results */}
      {result && (
        <Paper p="md">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <Text fw={600} fz="sm">결과</Text>
              <Badge
                size="xs"
                color={result.status === 'complete' ? 'green' : result.status === 'partial' ? 'yellow' : 'red'}
                variant="light"
              >
                {result.status === 'complete' ? '완료' : result.status === 'partial' ? '부분 완료' : '실패'}
              </Badge>
              {result.costSummary.totalTokens > 0 && (
                <Badge size="xs" variant="light" color="gray">
                  {result.costSummary.totalTokens.toLocaleString()} tokens
                </Badge>
              )}
            </Group>
            <Group gap="xs">
              {result.plan && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    color="gray"
                    leftSection={<FloppyDisk size={14} />}
                    onClick={savePlanAsNode}
                  >
                    기획서 저장
                  </Button>
                  {result.plan.gaps?.length > 0 && (
                    <Button
                      size="xs"
                      variant="light"
                      color="gray"
                      leftSection={<GitBranch size={14} />}
                      onClick={createIssuesFromGaps}
                    >
                      이슈 생성 ({result.plan.gaps.length})
                    </Button>
                  )}
                </>
              )}
            </Group>
          </Group>

          <Accordion variant="separated">
            {result.analysis && (
              <Accordion.Item value="analysis">
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fz="sm" fw={500}>1. 시나리오 분석</Text>
                    {result.costSummary.stages.analyze && (
                      <Badge size="xs" variant="light" color="gray">
                        {result.costSummary.stages.analyze.toLocaleString()} tokens
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <StageResult data={result.analysis} />
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {result.plan && (
              <Accordion.Item value="plan">
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fz="sm" fw={500}>2. 기능 기획</Text>
                    {result.costSummary.stages.plan && (
                      <Badge size="xs" variant="light" color="gray">
                        {result.costSummary.stages.plan.toLocaleString()} tokens
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <StageResult data={result.plan} />
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {result.spec && (
              <Accordion.Item value="spec">
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fz="sm" fw={500}>3. 기술 설계</Text>
                    {result.costSummary.stages.spec && (
                      <Badge size="xs" variant="light" color="gray">
                        {result.costSummary.stages.spec.toLocaleString()} tokens
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <StageResult data={result.spec} />
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {result.implementation && (
              <Accordion.Item value="implementation">
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fz="sm" fw={500}>4. 구현 가이드</Text>
                    {result.costSummary.stages.implement && (
                      <Badge size="xs" variant="light" color="gray">
                        {result.costSummary.stages.implement.toLocaleString()} tokens
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <StageResult data={result.implementation} />
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {result.qa && (
              <Accordion.Item value="qa">
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fz="sm" fw={500}>5. QA 검증</Text>
                    {result.qa.score != null && (
                      <Badge
                        size="xs"
                        variant="light"
                        color={result.qa.score >= 90 ? 'green' : result.qa.score >= 70 ? 'yellow' : 'red'}
                      >
                        {result.qa.score}점
                      </Badge>
                    )}
                    {result.costSummary.stages.qa && (
                      <Badge size="xs" variant="light" color="gray">
                        {result.costSummary.stages.qa.toLocaleString()} tokens
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <StageResult data={result.qa} />
                </Accordion.Panel>
              </Accordion.Item>
            )}
          </Accordion>

          {result.error && (
            <Box mt="sm">
              <Text fz="xs" c="red">오류: {result.error}</Text>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
}

/** JSON 결과를 보기 좋게 렌더링 */
function StageResult({ data }: { data: any }) {
  if (!data) return <Text fz="xs" c="dimmed">결과 없음</Text>;

  if (data.parseError) {
    return (
      <Stack gap="xs">
        <Badge size="xs" color="yellow" variant="light">JSON 파싱 실패 — 원문 표시</Badge>
        <Code block fz="xs">{data.raw}</Code>
      </Stack>
    );
  }

  return (
    <Code block fz="xs" style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
      {JSON.stringify(data, null, 2)}
    </Code>
  );
}
