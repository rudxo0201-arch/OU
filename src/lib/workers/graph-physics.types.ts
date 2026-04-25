export interface Attractor {
  id: string;
  x: number;
  y: number;
  strength: number;
  linkedNodeId?: string;
  visible?: boolean; // 편집 모드 밖에서 표시 여부 (default: false)
}
