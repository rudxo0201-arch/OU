import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Box, Stack, Title, Text, Paper } from '@mantine/core';
import { UsersThree } from '@phosphor-icons/react/dist/ssr';
import { JoinButton } from './JoinButton';

export default async function JoinPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Look up invite
  const { data: invite } = await supabase
    .from('group_invites')
    .select('*, groups(id, name, description)')
    .eq('token', params.token)
    .single();

  if (!invite || !invite.groups) return notFound();

  // Check if invite expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <Box px="xl" py={80} maw={480} mx="auto">
        <Stack align="center" gap="md">
          <Text size="lg" fw={600}>초대가 만료되었습니다.</Text>
          <Text size="sm" c="dimmed">새 초대 링크를 요청해 주세요.</Text>
        </Stack>
      </Box>
    );
  }

  const group = invite.groups as { id: string; name: string; description: string | null };

  // If not logged in, redirect to login with return URL
  if (!user) {
    redirect(`/login?next=/join/${params.token}`);
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    redirect(`/groups/${group.id}`);
  }

  return (
    <Box px="xl" py={80} maw={480} mx="auto">
      <Paper
        p="xl"
        radius="md"
        style={{ border: '0.5px solid var(--mantine-color-gray-3)' }}
      >
        <Stack align="center" gap="lg">
          <UsersThree size={48} weight="thin" color="var(--mantine-color-gray-6)" />

          <Stack align="center" gap={4}>
            <Title order={3} fw={600}>{group.name}</Title>
            {group.description && (
              <Text size="sm" c="dimmed" ta="center">{group.description}</Text>
            )}
          </Stack>

          <Text size="sm" c="dimmed">이 그룹에 참가하시겠습니까?</Text>

          <JoinButton groupId={group.id} />
        </Stack>
      </Paper>
    </Box>
  );
}
