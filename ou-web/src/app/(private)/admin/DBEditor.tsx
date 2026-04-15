'use client';

import { useState } from 'react';
import { Stack, Select, Group, Text } from '@mantine/core';
import { Database } from '@phosphor-icons/react';
import { TABLE_SCHEMAS } from '@/lib/admin/table-schemas';
import { DBTableView } from './DBTableView';

export function DBEditor() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const tableOptions = TABLE_SCHEMAS.map(t => ({
    value: t.name,
    label: `${t.label} (${t.name})`,
    group: getTableGroup(t.name),
  }));

  return (
    <Stack gap="md">
      <Group gap="sm">
        <Database size={18} weight="light" />
        <Text fw={600} fz="sm">DB 에디터</Text>
      </Group>

      <Select
        placeholder="테이블을 선택하세요"
        data={tableOptions}
        value={selectedTable}
        onChange={setSelectedTable}
        searchable
        w={360}
      />

      {selectedTable ? (
        <DBTableView tableName={selectedTable} key={selectedTable} />
      ) : (
        <Text c="dimmed" ta="center" py="xl" fz="sm">
          테이블을 선택하면 데이터를 조회하고 편집할 수 있어요.
        </Text>
      )}
    </Stack>
  );
}

function getTableGroup(name: string): string {
  const groups: Record<string, string[]> = {
    '핵심 데이터': ['data_nodes', 'sections', 'sentences', 'triples', 'triple_sentence_sources', 'node_relations', 'messages', 'message_events'],
    '회원/그룹': ['profiles', 'groups', 'group_members', 'group_invites', 'personas', 'persona_node_visibility', 'persona_follows'],
    '뷰/마켓': ['saved_views', 'view_members', 'market_items', 'market_purchases'],
    '시스템': ['subscriptions', 'token_usage', 'verification_requests', 'verification_votes', 'api_audit_log', 'api_cost_log', 'unresolved_entities', 'user_node_refs'],
    '채팅': ['chat_rooms', 'chat_room_members', 'chat_messages'],
  };
  for (const [group, tables] of Object.entries(groups)) {
    if (tables.includes(name)) return group;
  }
  return '기타';
}
