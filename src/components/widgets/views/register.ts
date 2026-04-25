import { registerWidget } from '../registry';
import { OuViewWidget } from './OuLLM';
import { ClockWidget } from './ClockWidget';
import { TodaySummaryWidget } from './TodaySummaryWidget';
import { RecentNodesWidget } from './RecentNodesWidget';
import { QuickMemoWidget } from './QuickMemoWidget';
import { ViewWidget } from './ViewWidget';
import { DictionaryWidget } from './DictionaryWidget';
import { BonchoWidget } from './BonchoWidget';
import { StreakWidget } from './StreakWidget';
import { TodayScheduleWidget } from './TodayScheduleWidget';
import { ChatHeatmapWidget } from './ChatHeatmapWidget';
import { ApiTokenWidget } from './ApiTokenWidget';
import { TaskWidget } from './TaskWidget';
import { HabitWidget } from './HabitWidget';
import { IdeaWidget } from './IdeaWidget';
import { FinanceWidget } from './FinanceWidget';
import { NoteWidget } from './NoteWidget';
registerWidget({
  type: 'oullm',
  label: 'OU LLM',
  component: OuViewWidget,
  scrollable: 'none',
  minSize: [4, 2],
  defaultSize: [5, 2],
  removable: false,
  needsCard: false,
});

registerWidget({
  type: 'clock',
  label: '시계',
  component: ClockWidget,
  scrollable: 'none',
  minSize: [2, 2],
  defaultSize: [2, 2],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'today-summary',
  label: '오늘 요약',
  component: TodaySummaryWidget,
  scrollable: 'none',
  minSize: [2, 2],
  defaultSize: [3, 2],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'recent-nodes',
  label: '최근 노드',
  component: RecentNodesWidget,
  scrollable: 'vertical',
  minSize: [2, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'quick-memo',
  label: '퀵메모',
  component: QuickMemoWidget,
  scrollable: 'none',
  minSize: [2, 2],
  defaultSize: [3, 2],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-boncho',
  label: '본초학',
  component: BonchoWidget,
  scrollable: 'both',
  minSize: [3, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-dictionary',
  label: '한자사전',
  component: DictionaryWidget,
  scrollable: 'both',
  minSize: [4, 3],
  defaultSize: [6, 4],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-todo',
  label: '투두',
  component: ViewWidget,
  scrollable: 'vertical',
  minSize: [2, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-calendar',
  label: '캘린더',
  component: ViewWidget,
  scrollable: 'vertical',
  minSize: [4, 2],
  defaultSize: [5, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-chart',
  label: '지출 차트',
  component: ViewWidget,
  scrollable: 'vertical',
  minSize: [2, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-heatmap',
  label: '히트맵',
  component: ViewWidget,
  scrollable: 'none',
  minSize: [3, 2],
  defaultSize: [4, 2],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-relation',
  label: '관계 카드',
  component: ViewWidget,
  scrollable: 'vertical',
  minSize: [2, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-profile',
  label: '프로필',
  component: ViewWidget,
  scrollable: 'vertical',
  minSize: [2, 2],
  defaultSize: [3, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'view-map',
  label: '지도',
  component: ViewWidget,
  scrollable: 'none',
  minSize: [4, 2],
  defaultSize: [5, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'streak',
  label: '연속 대화',
  component: StreakWidget,
  scrollable: 'none',
  minSize: [2, 2],
  defaultSize: [2, 2],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'today-schedule',
  label: '오늘 일정',
  component: TodayScheduleWidget,
  scrollable: 'vertical',
  minSize: [3, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'chat-heatmap',
  label: '대화 히트맵',
  component: ChatHeatmapWidget,
  scrollable: 'none',
  minSize: [3, 2],
  defaultSize: [4, 2],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'api-token',
  label: 'API 토큰',
  component: ApiTokenWidget,
  scrollable: 'none',
  minSize: [2, 2],
  defaultSize: [3, 2],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'today-tasks',
  label: '할 일',
  component: TaskWidget,
  scrollable: 'vertical',
  minSize: [3, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'habit-log',
  label: '습관',
  component: HabitWidget,
  scrollable: 'vertical',
  minSize: [3, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'idea-notes',
  label: '아이디어',
  component: IdeaWidget,
  scrollable: 'vertical',
  minSize: [2, 2],
  defaultSize: [3, 2],
  removable: true,
  needsCard: false,
});


registerWidget({
  type: 'today-finance',
  label: '지출',
  component: FinanceWidget,
  scrollable: 'vertical',
  minSize: [3, 2],
  defaultSize: [4, 3],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'recent-notes',
  label: '노트',
  component: NoteWidget,
  scrollable: 'vertical',
  minSize: [3, 2],
  defaultSize: [5, 3],
  removable: true,
  needsCard: false,
});
