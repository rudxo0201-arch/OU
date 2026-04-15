import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import {
  Box, Stack, Title, Text, Paper, Group, Badge, Button,
  Avatar, Divider, SimpleGrid,
} from '@mantine/core';
import { UserPlus, UsersThree } from '@phosphor-icons/react/dist/ssr';

async function handleInvite(formData: FormData) {
  'use server';
  const groupId = formData.get('groupId') as string;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/groups/${groupId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  // In a real implementation, this would be handled client-side
  return data;
}

export default async function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', params.groupId)
    .single();

  if (!group) return notFound();

  // Check membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', params.groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) return notFound();

  // Get members
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(display_name, avatar_url)')
    .eq('group_id', params.groupId)
    .order('joined_at', { ascending: true });

  // Get group DataNodes
  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('id, title, domain, created_at, confidence')
    .eq('group_id', params.groupId)
    .order('created_at', { ascending: false })
    .limit(20);

  const isOwner = membership.role === 'owner';

  return (
    <Box px="xl" py="lg" maw={960} mx="auto">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2} fw={600}>{group.name}</Title>
            {group.description && (
              <Text size="sm" c="dimmed">{group.description}</Text>
            )}
          </Stack>
          {isOwner && (
            <Button
              variant="outline"
              color="dark"
              size="sm"
              leftSection={<UserPlus size={16} />}
              style={{ borderWidth: '0.5px' }}
              component="a"
              href={`/api/groups/${params.groupId}/invite`}
              data-method="POST"
            >
              초대하기
            </Button>
          )}
        </Group>

        <Divider color="gray.2" size={0.5} />

        {/* Members */}
        <Stack gap="sm">
          <Group gap="xs">
            <UsersThree size={18} />
            <Text fw={600} size="sm">멤버 ({members?.length || 0})</Text>
          </Group>
          <Stack gap="xs">
            {members?.map((member) => {
              const profileArr = member.profiles as unknown as { display_name: string | null; avatar_url: string | null }[] | null;
              const profile = profileArr?.[0] ?? null;
              return (
                <Group key={member.user_id} gap="sm">
                  <Avatar
                    src={profile?.avatar_url}
                    size="sm"
                    radius="xl"
                  >
                    {profile?.display_name?.[0] || '?'}
                  </Avatar>
                  <Text size="sm">{profile?.display_name || '알 수 없음'}</Text>
                  <Badge
                    variant="outline"
                    color="gray"
                    size="xs"
                    style={{ borderWidth: '0.5px' }}
                  >
                    {member.role}
                  </Badge>
                </Group>
              );
            })}
          </Stack>
        </Stack>

        <Divider color="gray.2" size={0.5} />

        {/* DataNodes */}
        <Stack gap="sm">
          <Text fw={600} size="sm">기록 ({nodes?.length || 0})</Text>
          {(!nodes || nodes.length === 0) ? (
            <Text size="sm" c="dimmed">아직 등록된 기록이 없습니다.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {nodes.map((node) => (
                <Paper
                  key={node.id}
                  p="md"
                  radius="md"
                  style={{ border: '0.5px solid var(--mantine-color-gray-3)' }}
                >
                  <Stack gap={4}>
                    <Text size="sm" fw={500} lineClamp={1}>
                      {node.title || node.id}
                    </Text>
                    <Group gap="xs">
                      {node.domain && (
                        <Badge variant="outline" color="gray" size="xs" style={{ borderWidth: '0.5px' }}>
                          {node.domain}
                        </Badge>
                      )}
                      {node.confidence && (
                        <Badge variant="outline" color="gray" size="xs" style={{ borderWidth: '0.5px' }}>
                          {node.confidence}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
