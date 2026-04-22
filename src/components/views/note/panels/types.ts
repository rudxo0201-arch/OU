export type PanelContent =
  | { kind: 'note';  noteId?: string }
  | { kind: 'pdf';   url?: string; fileName?: string }
  | { kind: 'graph' }
  | { kind: 'empty' };

export interface LeafPanel {
  id: string;
  type: 'leaf';
  content: PanelContent;
}

export interface SplitPanel {
  id: string;
  type: 'split';
  direction: 'h' | 'v';   // h = left/right, v = top/bottom
  sizes: [number, number]; // percentage, sum ≈ 100
  children: [PanelTree, PanelTree];
}

export type PanelTree = LeafPanel | SplitPanel;
