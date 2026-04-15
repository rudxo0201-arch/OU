'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Stack, Group, TextInput, Select, Table, Badge, Text, Avatar,
  Pagination, Button, ActionIcon, Menu, Modal, Paper, Checkbox, Loader,
} from '@mantine/core';
import { MagnifyingGlass, DotsThree, UserMinus, Prohibit, UserPlus, Shield } from '@phosphor-icons/react';
import { useSelection } from '@/hooks/useSelection';

interface Member {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  node_count: number;
  verified: boolean;
}

export function MemberManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionModal, setActionModal] = useState<{ member: Member; action: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const PAGE_SIZE = 20;

  const pageIds = useMemo(() => members.map(m => m.id), [members]);
  const selection = useSelection<string>(pageIds);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search,
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      const res = await fetch(`/api/admin/members?${params}`);
      const json = await res.json();
      setMembers(json.data ?? []);
      setTotal(json.total ?? 0);
      selection.clearAll();
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleAction = async (userId: string, action: string, role?: string) => {
    setProcessing(true);
    try {
      await fetch(`/api/admin/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, role }),
      });
      setActionModal(null);
      fetchMembers();
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchAction = async (action: string) => {
    setProcessing(true);
    try {
      const ids = Array.from(selection.selected);
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/members/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      ));
      fetchMembers();
    } finally {
      setProcessing(false);
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'dark';
      case 'banned': return 'red';
      case 'deactivated': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="sm">
        <TextInput
          placeholder="이름, 이메일 검색..."
          leftSection={<MagnifyingGlass size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          w={240}
          size="xs"
        />
        <Select
          placeholder="역할"
          data={['admin', 'member', 'banned', 'deactivated']}
          value={roleFilter}
          onChange={setRoleFilter}
          clearable
          w={140}
          size="xs"
        />
        <Text fz="xs" c="dimmed">총 {total.toLocaleString()}명</Text>
      </Group>

      {/* Batch actions */}
      {selection.selected.size > 0 && (
        <Paper p="xs">
          <Group gap="xs">
            <Text fz="xs" c="dimmed">{selection.selected.size}명 선택</Text>
            <Button size="xs" variant="light" color="gray" onClick={() => handleBatchAction('deactivate')} loading={processing}>
              일괄 비활성화
            </Button>
            <Button size="xs" variant="light" color="gray" onClick={() => handleBatchAction('ban')} loading={processing}>
              일괄 차단
            </Button>
            <Button size="xs" variant="light" color="gray" onClick={() => selection.clearAll()}>
              선택 해제
            </Button>
          </Group>
        </Paper>
      )}

      {/* Table */}
      <Table highlightOnHover fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={36}>
              <Checkbox
                size="xs"
                checked={selection.headerCheckbox.checked}
                indeterminate={selection.headerCheckbox.indeterminate}
                onChange={() => {
                  if (selection.headerCheckbox.checked) selection.deselectPage(pageIds);
                  else selection.selectPage(pageIds);
                }}
              />
            </Table.Th>
            <Table.Th>회원</Table.Th>
            <Table.Th w={100}>역할</Table.Th>
            <Table.Th w={80}>데이터</Table.Th>
            <Table.Th w={110}>가입일</Table.Th>
            <Table.Th w={50} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Group justify="center" py="md"><Loader size="sm" /></Group>
              </Table.Td>
            </Table.Tr>
          ) : members.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">회원이 없어요.</Text>
              </Table.Td>
            </Table.Tr>
          ) : members.map(m => (
            <Table.Tr key={m.id}>
              <Table.Td>
                <Checkbox
                  size="xs"
                  checked={selection.isSelected(m.id)}
                  onChange={() => selection.toggle(m.id)}
                />
              </Table.Td>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Avatar src={m.avatar_url ?? undefined} size="sm" radius="xl" color="gray">
                    {(m.display_name ?? '?')[0]}
                  </Avatar>
                  <Stack gap={0}>
                    <Text fz="xs" fw={500} lineClamp={1}>{m.display_name ?? '이름 없음'}</Text>
                    <Text fz="xs" c="dimmed" lineClamp={1}>{m.email}</Text>
                  </Stack>
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={roleColor(m.role)} size="xs">{m.role ?? 'member'}</Badge>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed">{m.node_count.toLocaleString()}</Text>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed">{new Date(m.created_at).toLocaleDateString('ko-KR')}</Text>
              </Table.Td>
              <Table.Td>
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="xs"><DotsThree size={16} weight="bold" /></ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<Shield size={14} />}
                      onClick={() => { setActionModal({ member: m, action: 'change_role' }); setSelectedRole(m.role); }}
                    >
                      역할 변경
                    </Menu.Item>
                    {m.role !== 'deactivated' && (
                      <Menu.Item
                        leftSection={<UserMinus size={14} />}
                        onClick={() => setActionModal({ member: m, action: 'deactivate' })}
                      >
                        비활성화
                      </Menu.Item>
                    )}
                    {m.role === 'deactivated' && (
                      <Menu.Item
                        leftSection={<UserPlus size={14} />}
                        onClick={() => handleAction(m.id, 'activate')}
                      >
                        활성화
                      </Menu.Item>
                    )}
                    {m.role !== 'banned' ? (
                      <Menu.Item
                        leftSection={<Prohibit size={14} />}
                        color="red"
                        onClick={() => setActionModal({ member: m, action: 'ban' })}
                      >
                        차단
                      </Menu.Item>
                    ) : (
                      <Menu.Item
                        leftSection={<UserPlus size={14} />}
                        onClick={() => handleAction(m.id, 'unban')}
                      >
                        차단 해제
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>

      {/* Action Confirm Modal */}
      <Modal
        opened={actionModal !== null}
        onClose={() => setActionModal(null)}
        title={getActionTitle(actionModal?.action)}
        centered
        size="sm"
      >
        {actionModal && (
          <Stack gap="md">
            <Group gap="sm">
              <Avatar src={actionModal.member.avatar_url ?? undefined} size="sm" radius="xl" color="gray">
                {(actionModal.member.display_name ?? '?')[0]}
              </Avatar>
              <Text fz="sm" fw={500}>{actionModal.member.display_name ?? actionModal.member.email}</Text>
            </Group>

            {actionModal.action === 'change_role' && (
              <Select
                label="변경할 역할"
                data={['admin', 'member', 'moderator', 'banned', 'deactivated']}
                value={selectedRole}
                onChange={setSelectedRole}
              />
            )}

            {actionModal.action === 'ban' && (
              <Text fz="sm" c="red">이 회원을 차단하면 서비스를 이용할 수 없게 됩니다.</Text>
            )}
            {actionModal.action === 'deactivate' && (
              <Text fz="sm" c="dimmed">이 회원의 계정을 비활성화합니다.</Text>
            )}

            <Group justify="flex-end" gap="xs">
              <Button variant="light" color="gray" onClick={() => setActionModal(null)}>취소</Button>
              <Button
                color={actionModal.action === 'ban' ? 'red' : 'dark'}
                loading={processing}
                onClick={() => handleAction(
                  actionModal.member.id,
                  actionModal.action,
                  actionModal.action === 'change_role' ? selectedRole ?? undefined : undefined
                )}
              >
                확인
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function getActionTitle(action?: string): string {
  switch (action) {
    case 'change_role': return '역할 변경';
    case 'ban': return '회원 차단';
    case 'deactivate': return '계정 비활성화';
    default: return '회원 조치';
  }
}
