import type { DomainExtractionConfig } from './types';
import { config as scheduleConfig } from './domains/schedule';
import { config as taskConfig } from './domains/task';
import { config as financeConfig } from './domains/finance';
import { config as knowledgeConfig } from './domains/knowledge';
import { config as ideaConfig } from './domains/idea';
import { config as emotionConfig } from './domains/emotion';
import { config as habitConfig } from './domains/habit';
import { config as relationConfig } from './domains/relation';
import { config as developmentConfig } from './domains/development';
import { config as mediaConfig } from './domains/media';
import { config as defaultConfig } from './domains/_default';

export const EXTRACTION_REGISTRY: Record<string, DomainExtractionConfig> = {
  schedule: scheduleConfig,
  task: taskConfig,
  finance: financeConfig,
  knowledge: knowledgeConfig,
  education: knowledgeConfig,  // education → knowledge 흡수
  idea: ideaConfig,
  emotion: emotionConfig,
  habit: habitConfig,
  health: habitConfig,          // health → habit 흡수 (category:"health")
  relation: relationConfig,
  relationship: relationConfig, // relationship → relation 통합
  development: developmentConfig,
  media: mediaConfig,
};

export const DEFAULT_EXTRACTION_CONFIG = defaultConfig;

export function getDomainConfig(domain: string): DomainExtractionConfig {
  return EXTRACTION_REGISTRY[domain] ?? DEFAULT_EXTRACTION_CONFIG;
}
