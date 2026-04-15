import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Box, Stack, Title, Text, Paper, Group, Badge, Button, SimpleGrid } from '@mantine/core';
import { UsersThree, Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('group_members')
    .select('role, groups(id, name, description, created_at)')
    .eq('user_id', user.id);

  // Get member counts for each group
  type GroupRow = { id: string; name: string; description: string | null; created_at: string };
  const groups = memberships?.map((m) => ({
    ...(m.groups as unknown as GroupRow),
    role: m.role as string,
  })) ?? [];

  const groupIds = groups.map((g) => g.id);

  const { data: memberCounts } = groupIds.length > 0
    ? await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  memberCounts?.forEach((mc) => {
    countMap[mc.group_id] = (countMap[mc.group_id] || 0) + 1;
  });

  return (
    <Box px="xl" py="lg" maw={960} mx="auto">
      <Group justify="space-between" mb="xl">
        <Title order={2} fw={600}>그룹</Title>
        <Button
          component={Link}
          href="/groups/new"
          variant="outline"
          color="dark"
          size="sm"
          leftSection={<Plus size={16} />}
          style={{ borderWidth: '0.5px' }}
        >
          새 그룹 만들기
        </Button>
      </Group>

      {groups.length === 0 ? (
        <Stack align="center" py={80} gap="sm">
          <UsersThree size={48} weight="thin" color="var(--mantine-color-gray-5)" />
          <Text c="dimmed" size="sm">아직 그룹이 없어요</Text>
        </Stack>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {groups.map((group) => (
            <Paper
              key={group.id}
              component={Link}
              href={`/groups/${group.id}`}
              p="lg"
              radius="md"
              style={{
                border: '0.5px solid var(--mantine-color-gray-3)',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={600} size="md">{group.name}</Text>
                  <Badge
                    variant="outline"
                    color="gray"
                    size="sm"
                    style={{ borderWidth: '0.5px' }}
                  >
                    {group.role}
                  </Badge>
                </Group>
                {group.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {group.description}
                  </Text>
                )}
                <Group gap="xs">
                  <UsersThree size={14} color="var(--mantine-color-gray-6)" />
                  <Text size="xs" c="dimmed">
                    {countMap[group.id] || 0}명
                  </Text>
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
