'use client';

import { useState } from 'react';
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

  // Group options by group
  const grouped = tableOptions.reduce<Record<string, typeof tableOptions>>((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Database size={18} weight="light" />
        <span style={{ fontWeight: 600, fontSize: 13 }}>DB 에디터</span>
      </div>

      <select
        value={selectedTable ?? ''}
        onChange={e => setSelectedTable(e.target.value || null)}
        style={{ width: 360, padding: '8px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
      >
        <option value="">테이블을 선택하세요</option>
        {Object.entries(grouped).map(([group, opts]) => (
          <optgroup key={group} label={group}>
            {opts.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {selectedTable ? (
        <DBTableView tableName={selectedTable} key={selectedTable} />
      ) : (
        <p style={{ color: '#868e96', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
          테이블을 선택하면 데이터를 조회하고 편집할 수 있어요.
        </p>
      )}
    </div>
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
