export interface FilterRule {
  field: string;
  op: '=' | '!=' | '>' | '<' | 'contains' | 'has';
  value: string | number | boolean;
}

export interface ViewFilterConfig {
  domain?: string;
  filters?: FilterRule[];
  groupBy?: string;
  sort?: { field: string; dir: 'asc' | 'desc' };
  range?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
}

export interface OrbViewConfig {
  domain?: string;
  viewType?: string;
  filters?: FilterRule[];
  groupBy?: string;
  sort?: { field: string; dir: 'asc' | 'desc' };
  range?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
}
