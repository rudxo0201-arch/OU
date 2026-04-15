'use client';

import { useState, useRef } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, Badge, Divider, Avatar,
  TextInput, Textarea, Modal, Switch, Progress, FileButton,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  User, CreditCard, Bell, ShieldCheck, Database,
  Trash, ArrowRight, SignOut, Export, Upload, Warning,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RankBadge } from '@/components/ui/RankBadge';

interface SettingsClientProps {
  profile: {
    display_name?: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
    handle?: string;
  } | null;
  subscription: { plan?: string; token_limit?: number } | null;
  nodeCount: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  team: 5000,
};

export function SettingsClient({ profile, subscription, nodeCount }: SettingsClientProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [saving, setSaving] = useState(false);

  const [emailNotify, setEmailNotify] = useState(true);
  const [pushNotify, setPushNotify] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const resetRef = useRef<() => void>(null);

  const planId = subscription?.plan ?? 'free';
  const tokenLimit = subscription?.token_limit ?? PLAN_LIMITS[planId] ?? 100;

  // ── 프로필 저장 ──
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            display_name: displayName.trim(),
            bio: bio.trim(),
            handle: handle.trim(),
          })
          .eq('id', user.id);
        notifications.show({ message: '저장했어요.', color: 'gray' });
      }
    } catch {
      notifications.show({ message: '저장에 실패했어요.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const profileChanged =
    displayName.trim() !== (profile?.display_name ?? '') ||
    bio.trim() !== (profile?.bio ?? '') ||
    handle.trim() !== (profile?.handle ?? '');

  // ── 아바타 업로드 ──
  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      notifications.show({ message: '업로드에 실패했어요.', color: 'red' });
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    notifications.show({ message: '프로필 사진을 변경했어요.', color: 'gray' });
    router.refresh();
  };

  // ── 데이터 내보내기 (.ou) ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: nodes } = await supabase
        .from('data_nodes')
        .select('id')
        .eq('user_id', user.id);

      const { data: views } = await supabase
        .from('saved_views')
        .select('id')
        .eq('user_id', user.id);

      const res = await fetch('/api/export/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeIds: (nodes ?? []).map(n => n.id),
          viewIds: (views ?? []).map(v => v.id),
        }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ou-export-${new Date().toISOString().slice(0, 10)}.ou`;
      a.click();
      URL.revokeObjectURL(url);

      notifications.show({ message: '내보내기를 완료했어요.', color: 'gray' });
    } catch {
      notifications.show({ message: '내보내기에 실패했어요.', color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  // ── 데이터 가져오기 (.ou) ──
  const handleImport = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const ouFile = JSON.parse(text);

      const res = await fetch('/api/import/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ouFile),
      });

      if (!res.ok) throw new Error('Import failed');

      const result = await res.json();
      notifications.show({
        message: `가져오기 완료: ${result.imported?.nodes ?? 0}개 항목`,
        color: 'gray',
      });
      router.refresh();
    } catch {
      notifications.show({ message: '.ou 파일 형식이 올바르지 않아요.', color: 'red' });
    } finally {
      setImporting(false);
      resetRef.current?.();
    }
  };

  // ── 계정 삭제 ──
  const handleDeleteAccount = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <Stack gap="xl" p="xl" maw={560} mx="auto" pb={80}>
      <Title order={2}>설정</Title>

      {/* ─── 1. 프로필 ─── */}
      <Paper p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <User size={18} weight="light" />
            <Text fw={600} fz="sm">프로필</Text>
          </Group>
          <Divider />

          <Group justify="center" py="sm">
            <FileButton onChange={handleAvatarUpload} accept="image/*">
              {(props) => (
                <Tooltip label="사진 변경">
                  <Avatar
                    {...props}
                    src={profile?.avatar_url ?? undefined}
                    size={80}
                    radius="xl"
                    color="gray"
                    style={{ cursor: 'pointer' }}
                    component="button"
                  >
                    {(profile?.display_name ?? '?')[0]}
                  </Avatar>
                </Tooltip>
              )}
            </FileButton>
          </Group>

          {/* 등급 */}
          <Paper p="sm" withBorder={false} style={{ background: 'var(--mantine-color-default-hover)' }}>
            <RankBadge nodeCount={nodeCount} variant="full" />
          </Paper>

          <Stack gap="xs">
            <Text fz="xs" c="dimmed">이름</Text>
            <TextInput
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="표시 이름"
              size="sm"
            />
          </Stack>

          <Stack gap="xs">
            <Text fz="xs" c="dimmed">핸들</Text>
            <TextInput
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="handle"
              size="sm"
              leftSection={<Text fz="sm" c="dimmed">@</Text>}
            />
          </Stack>

          <Stack gap="xs">
            <Text fz="xs" c="dimmed">소개</Text>
            <Textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="한 줄 소개를 적어주세요"
              size="sm"
              autosize
              minRows={2}
              maxRows={4}
            />
          </Stack>

          <Button
            variant="light"
            color="gray"
            size="sm"
            onClick={handleSaveProfile}
            loading={saving}
            disabled={!profileChanged}
          >
            저장
          </Button>
        </Stack>
      </Paper>

      {/* ─── 2. 계정 ─── */}
      <Paper p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <ShieldCheck size={18} weight="light" />
            <Text fw={600} fz="sm">계정</Text>
          </Group>
          <Divider />

          <Stack gap={4}>
            <Text fz="xs" c="dimmed">이메일</Text>
            <Text fz="sm">{profile?.email ?? '-'}</Text>
          </Stack>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            justify="flex-start"
            px={0}
            onClick={() => router.push('/reset-password')}
          >
            비밀번호 변경
          </Button>
        </Stack>
      </Paper>

      {/* ─── 3. 구독 ─── */}
      <Paper p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="xs">
              <CreditCard size={18} weight="light" />
              <Text fw={600} fz="sm">구독</Text>
            </Group>
            <Badge variant="light" color="gray">{PLAN_LABELS[planId] ?? planId}</Badge>
          </Group>
          <Divider />

          <Group justify="space-between">
            <Text fz="sm" c="dimmed">현재 플랜</Text>
            <Text fz="sm" fw={500}>{PLAN_LABELS[planId] ?? planId}</Text>
          </Group>

          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz="xs" c="dimmed">사용량</Text>
              <Text fz="xs" c="dimmed">{nodeCount} / {tokenLimit}턴</Text>
            </Group>
            <Progress
              value={Math.min((nodeCount / tokenLimit) * 100, 100)}
              size="xs"
              color="gray"
            />
          </Stack>

          {planId === 'free' && (
            <Button
              variant="light"
              color="gray"
              size="sm"
              rightSection={<ArrowRight size={14} />}
              onClick={() => router.push('/settings/upgrade')}
            >
              업그레이드
            </Button>
          )}
          {planId !== 'free' && (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => router.push('/settings/upgrade')}
            >
              플랜 변경
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ─── 4. 알림 ─── */}
      <Paper p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <Bell size={18} weight="light" />
            <Text fw={600} fz="sm">알림</Text>
          </Group>
          <Divider />

          <Group justify="space-between">
            <Stack gap={2}>
              <Text fz="sm">이메일 알림</Text>
              <Text fz="xs" c="dimmed">새 소식이나 업데이트를 이메일로 받아요</Text>
            </Stack>
            <Switch
              checked={emailNotify}
              onChange={e => setEmailNotify(e.currentTarget.checked)}
              color="gray"
            />
          </Group>

          <Group justify="space-between">
            <Stack gap={2}>
              <Text fz="sm">푸시 알림</Text>
              <Text fz="xs" c="dimmed">곧 지원할 예정이에요</Text>
            </Stack>
            <Switch
              checked={pushNotify}
              onChange={e => setPushNotify(e.currentTarget.checked)}
              color="gray"
              disabled
            />
          </Group>
        </Stack>
      </Paper>

      {/* ─── 5. 보안 ─── */}
      <Paper p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <ShieldCheck size={18} weight="light" />
            <Text fw={600} fz="sm">보안</Text>
          </Group>
          <Divider />

          <Stack gap={4}>
            <Text fz="sm">활성 세션</Text>
            <Text fz="xs" c="dimmed">현재 세션 1개 활성 중</Text>
          </Stack>

          <Group justify="space-between">
            <Stack gap={2}>
              <Text fz="sm">2단계 인증</Text>
              <Text fz="xs" c="dimmed">곧 지원할 예정이에요</Text>
            </Stack>
            <Switch checked={false} color="gray" disabled />
          </Group>
        </Stack>
      </Paper>

      {/* ─── 6. 데이터 ─── */}
      <Paper p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <Database size={18} weight="light" />
            <Text fw={600} fz="sm">데이터</Text>
          </Group>
          <Divider />

          <Text fz="xs" c="dimmed">
            현재 {nodeCount}개의 데이터가 저장되어 있어요
          </Text>

          <Group grow>
            <Button
              variant="light"
              color="gray"
              size="sm"
              leftSection={<Export size={16} />}
              onClick={handleExport}
              loading={exporting}
            >
              내보내기 (.ou)
            </Button>

            <FileButton
              onChange={handleImport}
              accept=".ou,application/json"
              resetRef={resetRef}
            >
              {(props) => (
                <Button
                  {...props}
                  variant="light"
                  color="gray"
                  size="sm"
                  leftSection={<Upload size={16} />}
                  loading={importing}
                >
                  가져오기 (.ou)
                </Button>
              )}
            </FileButton>
          </Group>
        </Stack>
      </Paper>

      {/* ─── 7. 계정 삭제 ─── */}
      <Paper p="lg" style={{ borderColor: 'var(--mantine-color-red-9)' }}>
        <Stack gap="md">
          <Group gap="xs">
            <Warning size={18} weight="light" color="var(--mantine-color-red-6)" />
            <Text fw={600} fz="sm" c="red">위험 구역</Text>
          </Group>
          <Divider />

          <Text fz="sm" c="dimmed">
            계정을 삭제하면 모든 대화 기록과 저장된 내용이 사라져요. 되돌릴 수 없어요.
          </Text>

          <Button
            variant="light"
            color="gray"
            leftSection={<SignOut size={18} />}
            onClick={signOut}
            fullWidth
          >
            로그아웃
          </Button>

          <Button
            variant="subtle"
            color="red"
            leftSection={<Trash size={18} />}
            onClick={() => setDeleteModalOpen(true)}
            fullWidth
            size="sm"
          >
            계정 삭제
          </Button>
        </Stack>
      </Paper>

      {/* ─── 삭제 확인 모달 ─── */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="정말 계정을 삭제하시겠어요?"
        centered
      >
        <Stack gap="md">
          <Text fz="sm" c="dimmed">
            삭제하면 모든 대화 기록과 저장된 내용이 사라져요. 이 작업은 되돌릴 수 없어요.
          </Text>
          <Text fz="sm">
            계속하려면 아래에 <Text span fw={600}>&quot;삭제&quot;</Text>를 입력해주세요.
          </Text>
          <TextInput
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="삭제"
            size="sm"
          />
          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmText('');
              }}
            >
              취소
            </Button>
            <Button
              color="red"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== '삭제'}
            >
              삭제하기
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
