'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Group, TextInput, Select, Table, Badge, ActionIcon, Text,
  Pagination, Modal, Textarea, Button, Collapse, Box, Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MagnifyingGlass, PencilSimple, Archive, CaretDown, CaretUp } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface DataNode {
  id: string;
  domain: string;
  confidence: string;
  resolution: string | null;
  raw: string | null;
  created_at: string;
  user_id: string | null;
  is_archived?: boolean;
}

export function DataNodeManager() {
  const supabase = createClient();
  const [nodes, setNodes] = useState<DataNode[]>([]);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNode, setEditNode] = useState<DataNode | null>(null);
  const [editRaw, setEditRaw] = useState('');
  const [editDomain, setEditDomain] = useState<string | null>(null);
  const [editConfidence, setEditConfidence] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [domains, setDomains] = useState<string[]>([]);
  const PAGE_SIZE = 20;

  // Fetch available domains
  useEffect(() => {
    supabase
      .from('data_nodes')
      .select('domain')
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map(d => d.domain).filter(Boolean)));
          setDomains(unique as string[]);
        }
      });
  }, []);

  const fetchNodes = useCallback(async () => {
    let query = supabase
      .from('data_nodes')
      .select('id, domain, confidence, resolution, raw, created_at, user_id, is_archived', { count: 'exact' })
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (search) query = query.ilike('raw', `%${search}%`);
    if (domain) query = query.eq('domain', domain);
    if (confidence) query = query.eq('confidence', confidence);

    const { data, count } = await query;
    setNodes(data ?? []);
    setTotal(count ?? 0);
  }, [search, domain, confidence, page]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, domain, confidence]);

  const handleEdit = (node: DataNode) => {
    setEditNode(node);
    setEditRaw(node.raw ?? '');
    setEditDomain(node.domain);
    setEditConfidence(node.confidence);
    openEdit();
  };

  const handleSave = async () => {
    if (!editNode) return;
    setSaving(true);
    await supabase
      .from('data_nodes')
      .update({
        raw: editRaw,
        domain: editDomain,
        confidence: editConfidence,
      })
      .eq('id', editNode.id);
    setSaving(false);
    closeEdit();
    fetchNodes();
  };

  const handleArchive = async (id: string) => {
    await supabase
      .from('data_nodes')
      .update({ is_archived: true })
      .eq('id', id);
    fetchNodes();
  };

  const confidenceColor: Record<string, string> = { high: 'green', medium: 'yellow', low: 'red' };

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          placeholder="내용 검색..."
          leftSection={<MagnifyingGlass size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          flex={1}
        />
        <Select
          placeholder="분류"
          data={domains ?? []}
          value={domain}
          onChange={setDomain}
          clearable
          w={160}
        />
        <Select
          placeholder="신뢰도"
          data={['high', 'medium', 'low']}
          value={confidence}
          onChange={setConfidence}
          clearable
          w={120}
        />
      </Group>

      <Text fz="xs" c="dimmed">총 {total.toLocaleString()}건</Text>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={30}></Table.Th>
            <Table.Th>내용</Table.Th>
            <Table.Th w={100}>분류</Table.Th>
            <Table.Th w={80}>신뢰도</Table.Th>
            <Table.Th w={100}>생성일</Table.Th>
            <Table.Th w={80}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {nodes.map(node => (
            <>
              <Table.Tr
                key={node.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === node.id ? null : node.id)}
              >
                <Table.Td>
                  {expandedId === node.id
                    ? <CaretUp size={14} weight="bold" />
                    : <CaretDown size={14} weight="bold" />
                  }
                </Table.Td>
                <Table.Td><Text fz="sm" lineClamp={1} maw={400}>{node.raw ?? '-'}</Text></Table.Td>
                <Table.Td><Badge variant="light" color="gray" size="sm">{node.domain}</Badge></Table.Td>
                <Table.Td>
                  <Badge variant="light" color={confidenceColor[node.confidence] ?? 'gray'} size="sm">
                    {node.confidence}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text fz="xs" c="dimmed">{new Date(node.created_at).toLocaleDateString('ko-KR')}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap" onClick={e => e.stopPropagation()}>
                    <ActionIcon variant="subtle" size="sm" onClick={() => handleEdit(node)}>
                      <PencilSimple size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="sm" color="red" onClick={() => handleArchive(node.id)}>
                      <Archive size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
              {expandedId === node.id && (
                <Table.Tr key={`${node.id}-detail`}>
                  <Table.Td colSpan={6}>
                    <Paper p="sm" bg="var(--mantine-color-gray-0)">
                      <Stack gap="xs">
                        <Group gap="xs">
                          <Text fz="xs" c="dimmed" fw={600}>ID:</Text>
                          <Text fz="xs" c="dimmed" ff="monospace">{node.id}</Text>
                        </Group>
                        <Group gap="xs">
                          <Text fz="xs" c="dimmed" fw={600}>사용자:</Text>
                          <Text fz="xs" c="dimmed" ff="monospace">{node.user_id ?? '관리자'}</Text>
                        </Group>
                        <Group gap="xs">
                          <Text fz="xs" c="dimmed" fw={600}>해결:</Text>
                          <Text fz="xs">{node.resolution ?? '없음'}</Text>
                        </Group>
                        <Box>
                          <Text fz="xs" c="dimmed" fw={600} mb={4}>전체 내용:</Text>
                          <Text fz="sm" style={{ whiteSpace: 'pre-wrap' }}>{node.raw ?? '-'}</Text>
                        </Box>
                      </Stack>
                    </Paper>
                  </Table.Td>
                </Table.Tr>
              )}
            </>
          ))}
        </Table.Tbody>
      </Table>

      {nodes.length === 0 && (
        <Text c="dimmed" ta="center" py="xl" fz="sm">검색 결과가 없어요.</Text>
      )}

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>

      {/* Edit Modal */}
      <Modal opened={editOpened} onClose={closeEdit} title="데이터 수정" centered>
        <Stack gap="md">
          <Textarea
            label="내용"
            value={editRaw}
            onChange={e => setEditRaw(e.target.value)}
            minRows={4}
            autosize
          />
          <Select
            label="분류"
            data={domains ?? []}
            value={editDomain}
            onChange={setEditDomain}
          />
          <Select
            label="신뢰도"
            data={['high', 'medium', 'low']}
            value={editConfidence}
            onChange={setEditConfidence}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="light" color="gray" onClick={closeEdit}>취소</Button>
            <Button color="dark" loading={saving} onClick={handleSave}>저장</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
