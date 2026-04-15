// 관리자 패널 타입 정의

/** DB 에디터 - 컬럼 메타데이터 */
export type ColumnType =
  | 'text' | 'uuid' | 'boolean' | 'integer' | 'float'
  | 'timestamp' | 'json' | 'enum' | 'array';

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  label: string;
  editable: boolean;
  required?: boolean;
  /** enum 타입일 때 선택지 */
  options?: string[];
  /** FK 참조 테이블 */
  fkTable?: string;
  /** FK 참조 시 표시할 컬럼 */
  fkDisplay?: string;
  /** 테이블 목록에서 숨김 */
  hidden?: boolean;
}

export interface TableSchema {
  name: string;
  label: string;
  columns: ColumnSchema[];
  /** 기본 정렬 컬럼 */
  defaultSort?: string;
  /** 기본 정렬 방향 */
  defaultSortAsc?: boolean;
}

/** 회원 관리 */
export interface MemberRow {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  node_count: number;
}

export type MemberAction = 'deactivate' | 'activate' | 'ban' | 'unban' | 'change_role';

/** 역할/권한 */
export interface RoleDefinition {
  id: string;
  name: string;
  label: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

export const SYSTEM_PERMISSIONS = [
  'admin.access',
  'admin.users.manage',
  'admin.data.manage',
  'admin.views.manage',
  'admin.roles.manage',
  'admin.db.read',
  'admin.db.write',
  'chat.use',
  'data.create',
  'data.view_own',
  'data.view_public',
  'views.create',
  'views.share',
] as const;

export type Permission = typeof SYSTEM_PERMISSIONS[number];

/** 뷰 관리 */
export interface SavedViewRow {
  id: string;
  user_id: string;
  name: string;
  view_type: string;
  filter_config: Record<string, unknown> | null;
  layout_config: Record<string, unknown> | null;
  custom_code: string | null;
  visibility: 'private' | 'link' | 'public';
  is_default: boolean;
  description: string | null;
  icon: string | null;
  schema_map: Record<string, string> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** UX 플로우 */
export type UXNodeType = 'page' | 'component' | 'modal';
export type UXEdgeType = 'navigate' | 'data' | 'hover';

export interface UXFlowData {
  nodes: UXFlowNode[];
  edges: UXFlowEdge[];
}

export interface UXFlowNode {
  id: string;
  type: UXNodeType;
  label: string;
  route?: string;
  description?: string;
  position: { x: number; y: number };
}

export interface UXFlowEdge {
  id: string;
  source: string;
  target: string;
  type: UXEdgeType;
  label?: string;
}

/** 선택 훅 */
export interface SelectionState<T = string> {
  selected: Set<T>;
  isAllPages: boolean;
  toggle: (id: T) => void;
  selectPage: (ids: T[]) => void;
  deselectPage: (ids: T[]) => void;
  selectAll: () => void;
  clearAll: () => void;
  isSelected: (id: T) => boolean;
  headerCheckbox: { checked: boolean; indeterminate: boolean };
  count: number;
}
