export interface OUFile {
  version: string;
  metadata: {
    owner: string;
    language: string;
    created: string;
    title?: string;
    appVersion?: string;
  };
  nodes: OUNode[];
  edges: OUEdge[];
  views: OUView[];
}

export interface OUNode {
  id: string;
  domain: string;
  raw: string;
  domain_data?: Record<string, unknown>;
  triples?: Array<{
    subject: string;
    predicate: string;
    object: string;
  }>;
  created_at?: string;
}

export interface OUEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface OUView {
  id: string;
  name: string;
  viewType: string;
  filterConfig?: Record<string, unknown>;
  customCode?: string;
}
