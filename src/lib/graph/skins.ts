export interface NodeSkin {
  id: string;
  name: string;
  shape: 'star' | 'circle' | 'hexagon' | 'planet';
  color: string;
  glowEffect: boolean;
  pulseAnimation: boolean;
}

export interface EdgeSkin {
  id: string;
  name: string;
  style: 'solid' | 'dashed' | 'glow' | 'gradient';
  opacity: number;
  animated: boolean;
}

export interface GraphTheme {
  id: string;
  name: string;
  background: string;
  nodeSkin: NodeSkin;
  edgeSkin: EdgeSkin;
  gravityStrength: number;
  repulsionStrength: number;
}

export const DEFAULT_THEMES: GraphTheme[] = [
  {
    id: 'space',
    name: '우주 (기본)',
    background: '#060810',
    nodeSkin: {
      id: 'star',
      name: '별',
      shape: 'star',
      color: '#ffffff',
      glowEffect: true,
      pulseAnimation: true,
    },
    edgeSkin: {
      id: 'glow',
      name: '빛 번짐',
      style: 'glow',
      opacity: 0.3,
      animated: true,
    },
    gravityStrength: -120,
    repulsionStrength: 80,
  },
  {
    id: 'minimal',
    name: '미니멀',
    background: '#ffffff',
    nodeSkin: {
      id: 'circle',
      name: '원형',
      shape: 'circle',
      color: '#1a1a1a',
      glowEffect: false,
      pulseAnimation: false,
    },
    edgeSkin: {
      id: 'solid',
      name: '실선',
      style: 'solid',
      opacity: 0.2,
      animated: false,
    },
    gravityStrength: -100,
    repulsionStrength: 60,
  },
  {
    id: 'dark_glow',
    name: '다크 글로우',
    background: '#0a0a0a',
    nodeSkin: {
      id: 'planet',
      name: '행성',
      shape: 'planet',
      color: '#e0e0e0',
      glowEffect: true,
      pulseAnimation: false,
    },
    edgeSkin: {
      id: 'gradient',
      name: '그라디언트',
      style: 'gradient',
      opacity: 0.4,
      animated: true,
    },
    gravityStrength: -150,
    repulsionStrength: 100,
  },
  {
    id: 'paper',
    name: '페이퍼',
    background: '#f5f5f0',
    nodeSkin: {
      id: 'hexagon',
      name: '육각형',
      shape: 'hexagon',
      color: '#333333',
      glowEffect: false,
      pulseAnimation: false,
    },
    edgeSkin: {
      id: 'dashed',
      name: '점선',
      style: 'dashed',
      opacity: 0.3,
      animated: false,
    },
    gravityStrength: -80,
    repulsionStrength: 50,
  },
];
