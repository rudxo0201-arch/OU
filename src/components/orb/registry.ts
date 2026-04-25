export interface OrbDef {
  slug: string;
  title: string;
  icon: string;
  domain?: string;
  /** ViewRenderer에 전달할 풀페이지 뷰 타입. undefined이면 LLM 채팅(Deep Talk) */
  viewType?: string;
  placeholder?: string;
}

/**
 * Phase 1 Orb 카탈로그 (CLAUDE.md §3 정합).
 *
 * 4 도메인 Orb: schedule / task / habit / journal — 모두 시간축 위 행위.
 * 2 시스템 Orb: settings / admin — 설정·운영.
 * 1 입력 모달리티: deep-talk — 자유 LLM 대화창.
 *
 * Phase 2+에 추가될 슬러그(note, finance, idea, youtube, map, people, time, babylog 등)는
 * 들어올 때 이 파일에 추가한다. 위젯 레벨 inline 뷰 정리는 §14 별도 작업.
 */
export const ORB_REGISTRY: Record<string, OrbDef> = {
  schedule: { slug: 'schedule', title: '일정', icon: '◫', domain: 'schedule', viewType: 'calendar', placeholder: '일정을 알려주세요...' },
  task:     { slug: 'task',     title: '할 일', icon: '✓', domain: 'task',    viewType: 'todo',     placeholder: '해야 할 일을 말해보세요...' },
  habit:    { slug: 'habit',    title: '습관', icon: '⟳', domain: 'habit',    viewType: 'heatmap',  placeholder: '습관이나 루틴을 말해보세요...' },
  journal:  { slug: 'journal',  title: '일기', icon: '✎', domain: 'journal',  viewType: 'note',     placeholder: '오늘 있었던 일을 적어보세요...' },
  settings: { slug: 'settings', title: '설정', icon: '⚙' },
  admin:    { slug: 'admin',    title: '관리자', icon: '⚙', viewType: 'admin' },
  /** Deep Talk: viewType 없음 = LLM 자유 대화창. 도메인이 아니라 입력 모달리티 */
  'deep-talk': { slug: 'deep-talk', title: 'Deep Talk', icon: '◉', placeholder: '무엇이든 깊이 이야기해보세요...' },
};

export function getOrbDef(slug: string): OrbDef | null {
  return ORB_REGISTRY[slug] ?? null;
}
