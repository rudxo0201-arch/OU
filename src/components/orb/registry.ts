export interface OrbDef {
  slug: string;
  title: string;
  icon: string;
  domain?: string;
  /** ViewRenderer에 전달할 풀페이지 뷰 타입. undefined이면 LLM 채팅(Deep Talk) */
  viewType?: string;
  placeholder?: string;
}

export const ORB_REGISTRY: Record<string, OrbDef> = {
  note:     { slug: 'note',     title: '노트',     icon: '✎', domain: 'note',     viewType: 'note',     placeholder: '기록하고 싶은 내용을 말해보세요...' },
  calendar: { slug: 'calendar', title: '캘린더',   icon: '◫', domain: 'schedule', viewType: 'calendar', placeholder: '일정을 알려주세요...' },
  task:     { slug: 'task',     title: '할 일',    icon: '✓', domain: 'task',     viewType: 'todo',     placeholder: '해야 할 일을 말해보세요...' },
  finance:  { slug: 'finance',  title: '가계부',   icon: '◈', domain: 'finance',  viewType: 'chart',    placeholder: '오늘 지출 내역을 말해보세요...' },
  habit:    { slug: 'habit',    title: '습관',     icon: '⟳', domain: 'habit',    viewType: 'heatmap',  placeholder: '습관이나 루틴을 말해보세요...' },
  idea:     { slug: 'idea',     title: '아이디어', icon: '✦', domain: 'idea',     viewType: 'idea',     placeholder: '떠오르는 아이디어를 말해보세요...' },
  youtube:  { slug: 'youtube',  title: 'YouTube', icon: '▶', domain: 'media',    viewType: 'youtube',  placeholder: 'YouTube 영상을 기록해보세요...' },
  map:      { slug: 'map',      title: '지도',     icon: '◎', domain: 'location', viewType: 'map',      placeholder: '장소를 기록해보세요...' },
  people:   { slug: 'people',   title: '피플',     icon: '◯', domain: 'relation', viewType: 'profile',  placeholder: '사람이나 관계를 기록해보세요...' },
  time:     { slug: 'time',     title: '시계',     icon: '◷', viewType: 'time',    placeholder: '' },
  /** Deep Talk: viewType 없음 = LLM 대화창 */
  'deep-talk': { slug: 'deep-talk', title: 'Deep Talk', icon: '◉', placeholder: '무엇이든 깊이 이야기해보세요...' },
};

export function getOrbDef(slug: string): OrbDef | null {
  return ORB_REGISTRY[slug] ?? null;
}
