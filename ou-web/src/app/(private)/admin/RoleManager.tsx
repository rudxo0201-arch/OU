'use client';

import { useState, useEffect } from 'react';
import {
  Stack, Group, Text, Button, TextInput, Paper, Checkbox, Badge,
  ActionIcon, Modal, Loader, SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Trash, PencilSimple } from '@phosphor-icons/react';
import { SYSTEM_PERMISSIONS } from '@/types/admin';
import type { RoleDefinition } from '@/types/admin';

export function RoleManager() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      setEditName(selectedRole.name);
      setEditLabel(selectedRole.label);
      setEditPermissions([...selectedRole.permissions]);
    }
  }, [selectedRoleId]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const json = await res.json();
      setRoles(json.roles ?? []);
      if (json.roles?.length > 0 && !selectedRoleId) {
        setSelectedRoleId(json.roles[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveRoles = async (updatedRoles: RoleDefinition[]) => {
    setSaving(true);
    try {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: updatedRoles }),
      });
      setRoles(updatedRoles);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = (perm: string) => {
    setEditPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    const updated = roles.map(r =>
      r.id === selectedRoleId
        ? { ...r, name: editName, label: editLabel, permissions: editPermissions }
        : r
    );
    await saveRoles(updated);
  };

  const handleCreateRole = async () => {
    if (!newName || !newLabel) return;
    const newRole: RoleDefinition = {
      id: newName.toLowerCase().replace(/\s+/g, '_'),
      name: newName.toLowerCase().replace(/\s+/g, '_'),
      label: newLabel,
      permissions: [],
      is_system: false,
      created_at: new Date().toISOString(),
    };
    const updated = [...roles, newRole];
    await saveRoles(updated);
    setSelectedRoleId(newRole.id);
    setNewName('');
    setNewLabel('');
    closeCreate();
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.is_system) return;
    const updated = roles.filter(r => r.id !== id);
    await saveRoles(updated);
    if (selectedRoleId === id) setSelectedRoleId(updated[0]?.id ?? null);
  };

  if (loading) {
    return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  }

  const permissionGroups: Record<string, string[]> = {
    '관리자': SYSTEM_PERMISSIONS.filter(p => p.startsWith('admin.')),
    '채팅': SYSTEM_PERMISSIONS.filter(p => p.startsWith('chat.')),
    '데이터': SYSTEM_PERMISSIONS.filter(p => p.startsWith('data.')),
    '뷰': SYSTEM_PERMISSIONS.filter(p => p.startsWith('views.')),
  };

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Left: Role list */}
        <Paper p="md">
          <Group justify="space-between" mb="md">
            <Text fw={600} fz="sm">역할 목록</Text>
            <Button size="xs" variant="light" color="dark" leftSection={<Plus size={14} />} onClick={openCreate}>
              새 역할
            </Button>
          </Group>
          <Stack gap="xs">
            {roles.map(role => (
              <Paper
                key={role.id}
                p="xs"
                withBorder
                style={{
                  cursor: 'pointer',
                  borderColor: selectedRoleId === role.id ? 'var(--mantine-color-dark-4)' : undefined,
                }}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fz="sm" fw={500}>{role.label}</Text>
                    {role.is_system && <Badge variant="light" color="gray" size="xs">시스템</Badge>}
                  </Group>
                  {!role.is_system && (
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      color="red"
                      onClick={e => { e.stopPropagation(); handleDeleteRole(role.id); }}
                    >
                      <Trash size={14} />
                    </ActionIcon>
                  )}
                </Group>
                <Text fz="xs" c="dimmed">
                  {role.permissions.length}개 권한
                </Text>
              </Paper>
            ))}
          </Stack>
        </Paper>

        {/* Right: Permission editor */}
        <Paper p="md">
          {selectedRole ? (
            <Stack gap="md">
              <Group gap="sm">
                <PencilSimple size={16} />
                <Text fw={600} fz="sm">{selectedRole.label} 권한 설정</Text>
              </Group>

              <Group gap="sm">
                <TextInput
                  label="역할 ID"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  disabled={selectedRole.is_system}
                  size="xs"
                  flex={1}
                />
                <TextInput
                  label="표시 이름"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  size="xs"
                  flex={1}
                />
              </Group>

              {Object.entries(permissionGroups).map(([group, perms]) => (
                <Stack key={group} gap={4}>
                  <Text fz="xs" fw={600} c="dimmed">{group}</Text>
                  {perms.map(perm => (
                    <Checkbox
                      key={perm}
                      size="xs"
                      label={perm}
                      checked={editPermissions.includes(perm)}
                      onChange={() => handleTogglePermission(perm)}
                    />
                  ))}
                </Stack>
              ))}

              <Group justify="flex-end">
                <Button size="xs" color="dark" loading={saving} onClick={handleSaveRole}>
                  저장
                </Button>
              </Group>
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="xl" fz="sm">역할을 선택하세요.</Text>
          )}
        </Paper>
      </SimpleGrid>

      {/* Create Role Modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="새 역할" centered size="sm">
        <Stack gap="md">
          <TextInput label="역할 ID" placeholder="예: moderator" value={newName} onChange={e => setNewName(e.target.value)} />
          <TextInput label="표시 이름" placeholder="예: 운영자" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          <Group justify="flex-end" gap="xs">
            <Button variant="light" color="gray" onClick={closeCreate}>취소</Button>
            <Button color="dark" onClick={handleCreateRole}>생성</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
