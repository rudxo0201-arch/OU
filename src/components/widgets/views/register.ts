import { registerWidget } from '../registry';
import { OuViewWidget } from './OuViewWidget';
import { ClockWidget } from './ClockWidget';
import { TodaySummaryWidget } from './TodaySummaryWidget';
import { RecentNodesWidget } from './RecentNodesWidget';
import { QuickMemoWidget } from './QuickMemoWidget';

registerWidget({
  type: 'ou-view',
  label: 'OU뷰',
  component: OuViewWidget,
  scrollable: 'none',
  minSize: [3, 1],
  defaultSize: [4, 1],
  removable: false,
  needsCard: false,
});

registerWidget({
  type: 'clock',
  label: '시계',
  component: ClockWidget,
  scrollable: 'none',
  minSize: [1, 1],
  defaultSize: [2, 1],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'today-summary',
  label: '오늘 요약',
  component: TodaySummaryWidget,
  scrollable: 'none',
  minSize: [1, 1],
  defaultSize: [2, 1],
  removable: true,
  needsCard: false,
});

registerWidget({
  type: 'recent-nodes',
  label: '최근 노드',
  component: RecentNodesWidget,
  scrollable: 'vertical',
  minSize: [1, 1],
  defaultSize: [4, 3],
  removable: true,
  needsCard: true,
});

registerWidget({
  type: 'quick-memo',
  label: '퀵메모',
  component: QuickMemoWidget,
  scrollable: 'none',
  minSize: [1, 1],
  defaultSize: [2, 2],
  removable: true,
  needsCard: true,
});
