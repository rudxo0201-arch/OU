'use client';

import { useState } from 'react';
import {
  Stack, Title, Text, SimpleGrid, Paper, Button, Group, Center, Box,
  Divider, TextInput, Textarea, Table, Badge, Notification,
} from '@mantine/core';
import {
  Check, Buildings, ArrowRight, GraduationCap, Chalkboard,
  Briefcase, EnvelopeSimple, X,
} from '@phosphor-icons/react';
import Link from 'next/link';

// ── Feature comparison table ──
const PLAN_FEATURES = [
  { name: '데이터 저장', free: '100개', pro: '무제한', team: '무제한' },
  { name: '보기 방식', free: '기본 3종', pro: '전체', team: '전체 + 맞춤' },
  { name: '파일 업로드', free: '월 10건', pro: '무제한', team: '무제한' },
  { name: '공유 기능', free: '읽기 전용', pro: '읽기/쓰기', team: '팀 전체' },
  { name: '그룹', free: '-', pro: '5개', team: '무제한' },
  { name: '멤버 관리', free: '-', pro: '-', team: '관리자 권한' },
  { name: '학습 현황 분석', free: '-', pro: '기본', team: '상세 분석' },
  { name: '자동 업데이트 배포', free: '-', pro: '-', team: '지원' },
  { name: '전용 지원', free: '-', pro: '이메일', team: '전담 담당자' },
];

// ── Use case scenarios ──
const USE_CASES = [
  {
    icon: Chalkboard,
    title: '학원',
    subtitle: '강사 콘텐츠를 학생이 바로 활용',
    steps: [
      { label: '강사', desc: '수업 내용을 대화로 정리' },
      { label: '자동 변환', desc: '요약, 퀴즈, 플래시카드 생성' },
      { label: '학생 구독', desc: '수강생이 강사 자료를 구독' },
      { label: '시험 대비', desc: '오답 노트와 복습 자동 생성' },
    ],
    result: '강사는 수업에만 집중, 학생은 최신 자료로 복습',
  },
  {
    icon: GraduationCap,
    title: '대학교',
    subtitle: '강의를 놓쳐도 기록은 남아요',
    steps: [
      { label: '녹음', desc: '강의를 녹음하거나 텍스트 입력' },
      { label: '자동 정리', desc: '핵심 내용만 구조화' },
      { label: '공유', desc: '같은 수업 친구들과 자료 공유' },
      { label: '시험 준비', desc: '전체 강의 내용을 한눈에 복습' },
    ],
    result: '수업 내용이 자동으로 쌓이는 나만의 학습 아카이브',
  },
  {
    icon: Briefcase,
    title: '기업',
    subtitle: '회의가 끝나면 할 일이 자동으로 정리',
    steps: [
      { label: '회의', desc: '회의 내용을 대화로 기록' },
      { label: '자동 추출', desc: '할 일과 결정 사항 분리' },
      { label: '칸반 보기', desc: '팀 업무를 보드로 관리' },
      { label: '진행 추적', desc: '누가 뭘 했는지 한눈에 확인' },
    ],
    result: '회의록이 곧 업무 관리 도구가 되는 경험',
  },
];

const FEATURES = [
  '수업 자료를 한 번 수정하면 전원에게 자동 반영',
  '개인별 이해도를 한눈에 확인',
  '공동 과제와 프로젝트 관리',
  '오답 기록을 자동으로 정리',
  '취약한 부분을 시각적으로 파악',
  '어떤 언어로든 사용 가능',
];

const SCENARIOS = [
  {
    title: '학년 그룹 운영',
    before: '과대 -> 시간표 이미지 카톡 공지 -> 학생들 저장 -> 못 찾음 -> 반복',
    after: '과대 -> 시간표 한 번 수정 -> 학생 50명 자동 업데이트',
  },
  {
    title: '시험 대비',
    before: '교사 -> 요약 프린트 배포 -> 오류 발견 -> 다시 인쇄 -> 재배포',
    after: '교사 -> 요약 수정 1번 -> 구독 전원 즉시 최신본 확인',
  },
];

export default function B2BPage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    organization: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);

  const handleSubmitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/b2b/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        setSubmitResult('success');
        setContactForm({ name: '', organization: '', email: '', message: '' });
      } else {
        setSubmitResult('error');
      }
    } catch {
      setSubmitResult('error');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitResult(null), 5000);
    }
  };

  const canSubmit = contactForm.name.trim() && contactForm.email.trim() && contactForm.message.trim();

  return (
    <Stack gap={60} maw={900} mx="auto" p="xl">
      {/* Notification */}
      {submitResult && (
        <Notification
          icon={submitResult === 'success' ? <Check size={16} /> : <X size={16} />}
          color="gray"
          onClose={() => setSubmitResult(null)}
          withBorder
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 360 }}
        >
          {submitResult === 'success'
            ? '문의가 접수되었어요. 빠르게 연락드릴게요!'
            : '문의 접수에 실패했어요. 잠시 후 다시 시도해주세요.'}
        </Notification>
      )}

      {/* Hero */}
      <Stack gap="lg" ta="center" py="xl">
        <Buildings size={48} weight="light" color="var(--mantine-color-gray-5)" />
        <Title order={1} fz={{ base: 28, sm: 36 }}>
          조직을 위한 OU Team
        </Title>
        <Text c="dimmed" fz="lg" maw={500} mx="auto" style={{ lineHeight: 1.7 }}>
          대화로 쌓은 지식이 조직의 자산이 됩니다.
          모든 구성원이 항상 최신 자료를 확인하고,
          관리자는 전체 현황을 한눈에 파악합니다.
        </Text>
        <Group justify="center" gap="md">
          <Button
            size="lg"
            color="dark"
            onClick={() => {
              document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            도입 문의하기
          </Button>
          <Button
            size="lg"
            variant="light"
            color="gray"
            component={Link}
            href="/login"
          >
            먼저 체험해보기
          </Button>
        </Group>
      </Stack>

      {/* Features */}
      <div>
        <Text fw={600} fz="lg" mb="md">주요 기능</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {FEATURES.map(f => (
            <Paper key={f} p="md">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Box mt={2}>
                  <Check size={16} weight="bold" color="var(--mantine-color-gray-6)" />
                </Box>
                <Text fz="sm" style={{ lineHeight: 1.5 }}>{f}</Text>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      </div>

      {/* Use Case Scenarios */}
      <div>
        <Text fw={600} fz="lg" mb="sm">이런 곳에서 쓰고 있어요</Text>
        <Text fz="sm" c="dimmed" mb="md">
          다양한 조직에서 OU Team을 활용하는 방법
        </Text>
        <Stack gap="lg">
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <Paper key={uc.title} p="lg">
                <Group gap="sm" mb="md">
                  <Icon size={24} weight="light" />
                  <div>
                    <Text fw={600}>{uc.title}</Text>
                    <Text fz="xs" c="dimmed">{uc.subtitle}</Text>
                  </div>
                </Group>

                {/* Step flow */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="md">
                  {uc.steps.map((step, i) => (
                    <Box key={i}>
                      <Group gap={4} mb={4}>
                        <Badge variant="light" color="gray" size="xs" circle>
                          {i + 1}
                        </Badge>
                        <Text fz="xs" fw={600}>{step.label}</Text>
                      </Group>
                      <Text fz="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                        {step.desc}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>

                <Divider mb="sm" />
                <Group gap="xs">
                  <ArrowRight size={14} color="var(--mantine-color-gray-6)" />
                  <Text fz="sm" fw={500}>{uc.result}</Text>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </div>

      {/* Before/After Scenarios */}
      <div>
        <Text fw={600} fz="lg" mb="md">이렇게 달라져요</Text>
        <Stack gap="md">
          {SCENARIOS.map(scenario => (
            <Paper key={scenario.title} p="lg">
              <Text fw={600} mb="sm">{scenario.title}</Text>
              <Stack gap="sm">
                <Box>
                  <Text fz="xs" c="dimmed" mb={4}>기존 방식</Text>
                  <Text fz="sm" c="dimmed">{scenario.before}</Text>
                </Box>
                <Divider />
                <Box>
                  <Text fz="xs" c="dimmed" mb={4}>OU Team</Text>
                  <Text fz="sm">{scenario.after}</Text>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </div>

      {/* Plan Comparison Table */}
      <div>
        <Text fw={600} fz="lg" mb="md">요금제 비교</Text>
        <Paper p={0} style={{ overflow: 'auto' }}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 140 }}>기능</Table.Th>
                <Table.Th ta="center" style={{ minWidth: 100 }}>
                  <Stack gap={2} align="center">
                    <Text fz="sm" fw={600}>Free</Text>
                    <Text fz="xs" c="dimmed">무료</Text>
                  </Stack>
                </Table.Th>
                <Table.Th ta="center" style={{ minWidth: 100 }}>
                  <Stack gap={2} align="center">
                    <Text fz="sm" fw={600}>Pro</Text>
                    <Text fz="xs" c="dimmed">월 9,900원</Text>
                  </Stack>
                </Table.Th>
                <Table.Th ta="center" style={{ minWidth: 100 }}>
                  <Stack gap={2} align="center">
                    <Text fz="sm" fw={600}>Team</Text>
                    <Text fz="xs" c="dimmed">문의</Text>
                  </Stack>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {PLAN_FEATURES.map(f => (
                <Table.Tr key={f.name}>
                  <Table.Td>
                    <Text fz="sm">{f.name}</Text>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text fz="sm" c={f.free === '-' ? 'dimmed' : undefined}>
                      {f.free}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text fz="sm" c={f.pro === '-' ? 'dimmed' : undefined}>
                      {f.pro}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text fz="sm" fw={500}>{f.team}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </div>

      {/* Contact Form */}
      <Paper p="xl" id="contact-form">
        <Stack gap="lg">
          <Group gap="xs">
            <EnvelopeSimple size={20} weight="light" />
            <Text fw={600} fz="lg">도입 문의</Text>
          </Group>
          <Text fz="sm" c="dimmed">
            아래 양식을 작성하시면 담당자가 빠르게 연락드립니다.
          </Text>

          <Divider />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="이름"
              placeholder="홍길동"
              required
              size="sm"
              value={contactForm.name}
              onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextInput
              label="소속"
              placeholder="학교/학원/기업명"
              size="sm"
              value={contactForm.organization}
              onChange={e => setContactForm(prev => ({ ...prev, organization: e.target.value }))}
            />
          </SimpleGrid>

          <TextInput
            label="이메일"
            placeholder="example@email.com"
            required
            size="sm"
            type="email"
            value={contactForm.email}
            onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
          />

          <Textarea
            label="문의 내용"
            placeholder="도입을 고려하시는 이유, 예상 인원 수, 궁금한 점 등을 자유롭게 적어주세요."
            required
            size="sm"
            autosize
            minRows={4}
            maxRows={8}
            value={contactForm.message}
            onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
          />

          <Button
            color="dark"
            size="md"
            onClick={handleSubmitContact}
            loading={submitting}
            disabled={!canSubmit}
            rightSection={<ArrowRight size={16} />}
          >
            문의 보내기
          </Button>
        </Stack>
      </Paper>

      {/* CTA */}
      <Paper p="xl" ta="center">
        <Stack align="center" gap="md">
          <Title order={3}>지금 도입을 시작해보세요</Title>
          <Text c="dimmed" fz="sm">
            5명 이상 팀이라면 무료 체험이 가능합니다.
          </Text>
          <Button
            size="md"
            color="dark"
            rightSection={<ArrowRight size={16} />}
            onClick={() => {
              document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            도입 문의
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
