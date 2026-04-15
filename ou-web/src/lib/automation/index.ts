/**
 * Automation Module — Public Exports
 */
export type {
  AutomationTrigger,
  AutomationAction,
  Automation,
  AutomationContext,
} from './engine';

export {
  evaluateTrigger,
  executeAction,
  runAutomation,
  onNodeCreated,
  nodeToAutomation,
  automationToDomainData,
} from './engine';

export {
  formatForInstagram,
  formatForThreads,
} from './social-formatter';

export type { InstagramResult } from './social-formatter';
