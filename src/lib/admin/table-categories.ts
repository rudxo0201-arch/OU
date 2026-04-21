export interface TableCategory {
  label: string;
  tables: string[];
}

export const TABLE_CATEGORIES: TableCategory[] = [
  {
    label: '핵심 데이터',
    tables: ['data_nodes', 'messages', 'sections', 'sentences', 'triples', 'triple_sentence_sources', 'node_relations'],
  },
  {
    label: '회원 · 그룹',
    tables: ['profiles', 'personas', 'groups', 'group_members', 'group_invites', 'persona_follows', 'persona_node_visibility', 'user_node_refs'],
  },
  {
    label: '뷰 · 마켓',
    tables: ['saved_views', 'view_members', 'market_items', 'market_purchases'],
  },
  {
    label: '구독 · 비용',
    tables: ['subscriptions', 'token_usage', 'api_cost_log'],
  },
  {
    label: '채팅',
    tables: ['chat_rooms', 'chat_room_members', 'chat_messages'],
  },
  {
    label: '검증 · 로그',
    tables: ['verification_requests', 'verification_votes', 'unresolved_entities', 'message_events', 'api_audit_log', 'search_log'],
  },
];
