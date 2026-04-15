/**
 * Automation Engine — DataNode trigger + Action
 *
 * 도메인 중립: 트리거와 액션 모두 도메인에 독립적으로 동작.
 * n8n/Make를 대체하는 OU 내장 자동화 시스템.
 */

import { completeWithFallback } from '@/lib/llm';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Trigger Types ──────────────────────────────────────────

export interface AutomationTrigger {
  type: 'node_created' | 'schedule' | 'keyword' | 'domain_match' | 'count_threshold';
  config: Record<string, unknown>;
}

// ─── Action Types ───────────────────────────────────────────

export interface AutomationAction {
  type: 'create_view' | 'export_document' | 'post_social' | 'send_notification' | 'run_llm' | 'webhook';
  config: Record<string, unknown>;
}

// ─── Automation ─────────────────────────────────────────────

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  enabled: boolean;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error';
  lastRunError?: string;
}

// ─── Execution Context ──────────────────────────────────────

export interface AutomationContext {
  /** The node that triggered the automation (if trigger is node-based) */
  node?: {
    id: string;
    title: string;
    domain: string;
    raw?: string;
    tags?: string[];
    domain_data?: Record<string, unknown>;
  };
  /** Message content (for keyword trigger) */
  message?: string;
  /** Accumulated results from previous actions in the chain */
  previousResults?: Record<string, unknown>;
  /** The user who owns this automation */
  userId: string;
}

// ─── Trigger Evaluation ─────────────────────────────────────

export async function evaluateTrigger(
  trigger: AutomationTrigger,
  context: AutomationContext,
): Promise<boolean> {
  switch (trigger.type) {
    case 'node_created': {
      if (!context.node) return false;
      const cfg = trigger.config as { domain?: string; tags?: string[] };
      if (cfg.domain && context.node.domain !== cfg.domain) return false;
      if (cfg.tags && cfg.tags.length > 0) {
        const nodeTags = context.node.tags ?? [];
        const hasAllTags = cfg.tags.every((t: string) => nodeTags.includes(t));
        if (!hasAllTags) return false;
      }
      return true;
    }

    case 'schedule': {
      // Schedule triggers are evaluated by cron jobs, not inline.
      // Always return true when called from the cron handler.
      return true;
    }

    case 'keyword': {
      if (!context.message) return false;
      const cfg = trigger.config as { keywords: string[] };
      const lowerMsg = context.message.toLowerCase();
      return cfg.keywords.some((kw: string) => lowerMsg.includes(kw.toLowerCase()));
    }

    case 'domain_match': {
      if (!context.node) return false;
      const cfg = trigger.config as { domain: string; minCount?: number };
      return context.node.domain === cfg.domain;
    }

    case 'count_threshold': {
      // Count threshold is checked externally (by cron or event handler)
      // that passes a verified context. Return true when context matches.
      if (!context.node) return false;
      const cfg = trigger.config as { domain: string };
      return context.node.domain === cfg.domain;
    }

    default:
      return false;
  }
}

// ─── Action Execution ───────────────────────────────────────

export async function executeAction(
  action: AutomationAction,
  context: AutomationContext,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {
  switch (action.type) {
    case 'create_view': {
      const cfg = action.config as { viewType: string; filters: Record<string, unknown>; name?: string };
      const { data, error } = await supabase
        .from('saved_views')
        .insert({
          user_id: context.userId,
          name: cfg.name ?? `자동 생성 뷰`,
          view_type: cfg.viewType,
          filters: cfg.filters,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(`뷰 생성 실패: ${error.message}`);
      return { viewId: data.id, viewType: cfg.viewType };
    }

    case 'export_document': {
      const cfg = action.config as { format: 'md' | 'pdf' | 'txt' };
      const content = context.node?.raw ?? '';
      const title = context.node?.title ?? '내보내기';

      // Store as a data_node with domain 'export'
      const { data, error } = await supabase
        .from('data_nodes')
        .insert({
          user_id: context.userId,
          title: `${title}.${cfg.format}`,
          domain: 'export',
          raw: content,
          domain_data: {
            format: cfg.format,
            sourceNodeId: context.node?.id,
            exportedAt: new Date().toISOString(),
          },
          tags: ['export', cfg.format],
        })
        .select()
        .single();

      if (error) throw new Error(`내보내기 실패: ${error.message}`);
      return { exportNodeId: data.id, format: cfg.format };
    }

    case 'post_social': {
      const cfg = action.config as {
        platform: 'instagram' | 'threads' | 'twitter';
        template?: string;
      };

      // Use LLM output from previous step or raw content
      const llmOutput = (context.previousResults?.llm_output as string) ?? '';
      let postContent = cfg.template
        ? cfg.template.replace('{llm_output}', llmOutput)
        : llmOutput || context.node?.raw || '';

      if (!postContent) {
        postContent = context.node?.title ?? '';
      }

      // Store as broadcast DataNode
      const { data, error } = await supabase
        .from('data_nodes')
        .insert({
          user_id: context.userId,
          title: `[${cfg.platform}] ${context.node?.title ?? '포스트'}`,
          domain: 'broadcast',
          raw: postContent,
          domain_data: {
            platform: cfg.platform,
            sourceNodeId: context.node?.id,
            status: 'draft', // manual copy for now
            generatedAt: new Date().toISOString(),
          },
          tags: ['broadcast', cfg.platform],
        })
        .select()
        .single();

      if (error) throw new Error(`포스트 생성 실패: ${error.message}`);
      return { broadcastNodeId: data.id, platform: cfg.platform, content: postContent };
    }

    case 'send_notification': {
      const cfg = action.config as { message: string };
      let message = cfg.message;

      // Replace template variables
      if (context.node) {
        message = message
          .replace('{title}', context.node.title)
          .replace('{domain}', context.node.domain);
      }
      if (context.previousResults?.llm_output) {
        message = message.replace('{llm_output}', context.previousResults.llm_output as string);
      }

      // Store notification in data_nodes with domain 'notification'
      const { data, error } = await supabase
        .from('data_nodes')
        .insert({
          user_id: context.userId,
          title: '자동화 알림',
          domain: 'notification',
          raw: message,
          domain_data: {
            sourceAutomation: true,
            sourceNodeId: context.node?.id,
          },
          tags: ['notification', 'automation'],
        })
        .select()
        .single();

      if (error) throw new Error(`알림 생성 실패: ${error.message}`);
      return { notificationId: data.id, message };
    }

    case 'run_llm': {
      const cfg = action.config as { prompt: string; model?: string };
      const nodeContent = context.node?.raw ?? context.node?.title ?? '';

      const result = await completeWithFallback(
        [{ role: 'user', content: `${cfg.prompt}\n\n---\n\n${nodeContent}` }],
        {
          operation: 'automation_llm',
          userId: context.userId,
          nodeId: context.node?.id,
          maxTokens: 2048,
        },
      );

      return { llm_output: result.text, provider: result.provider };
    }

    case 'webhook': {
      const cfg = action.config as { url: string; method?: string; headers?: Record<string, string> };
      const body = {
        automationContext: {
          nodeId: context.node?.id,
          title: context.node?.title,
          domain: context.node?.domain,
        },
        previousResults: context.previousResults,
      };

      const response = await fetch(cfg.url, {
        method: cfg.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.headers ?? {}),
        },
        body: JSON.stringify(body),
      });

      return {
        webhookStatus: response.status,
        webhookResponse: response.ok ? await response.text() : null,
      };
    }

    default:
      throw new Error(`알 수 없는 액션 타입: ${action.type}`);
  }
}

// ─── Run Full Automation ────────────────────────────────────

export async function runAutomation(
  automation: Automation,
  context: AutomationContext,
  supabase: SupabaseClient,
): Promise<{ success: boolean; results: Record<string, unknown>[]; error?: string }> {
  const results: Record<string, unknown>[] = [];
  const runContext = { ...context };

  try {
    for (const action of automation.actions) {
      // Pass accumulated results to next action
      runContext.previousResults = results.length > 0
        ? results.reduce((acc, r) => ({ ...acc, ...r }), {})
        : undefined;

      const result = await executeAction(action, runContext, supabase);
      results.push(result);
    }

    // Update last run status
    await supabase
      .from('data_nodes')
      .update({
        domain_data: {
          ...(await getAutomationDomainData(automation.id, supabase)),
          lastRunAt: new Date().toISOString(),
          lastRunStatus: 'success',
          lastRunError: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.id);

    return { success: true, results };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabase
      .from('data_nodes')
      .update({
        domain_data: {
          ...(await getAutomationDomainData(automation.id, supabase)),
          lastRunAt: new Date().toISOString(),
          lastRunStatus: 'error',
          lastRunError: errorMsg,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.id);

    return { success: false, results, error: errorMsg };
  }
}

// ─── Event Handler: Check all automations for a trigger ─────

export async function onNodeCreated(
  node: AutomationContext['node'],
  userId: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (!node) return;

  // Fetch all enabled automations for this user
  const { data: automationNodes } = await supabase
    .from('data_nodes')
    .select('*')
    .eq('user_id', userId)
    .eq('domain', 'automation')
    .eq('domain_data->>enabled', 'true');

  if (!automationNodes?.length) return;

  const context: AutomationContext = { node, userId };

  for (const an of automationNodes) {
    const automation = nodeToAutomation(an);
    if (!automation || !automation.enabled) continue;

    const shouldRun = await evaluateTrigger(automation.trigger, context);
    if (shouldRun) {
      await runAutomation(automation, context, supabase);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────

async function getAutomationDomainData(
  automationId: string,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('data_nodes')
    .select('domain_data')
    .eq('id', automationId)
    .single();
  return (data?.domain_data as Record<string, unknown>) ?? {};
}

/** Convert a data_node (domain='automation') row to an Automation object */
export function nodeToAutomation(node: {
  id: string;
  title: string;
  user_id: string;
  domain_data: unknown;
}): Automation | null {
  const dd = node.domain_data as Record<string, unknown> | null;
  if (!dd) return null;

  return {
    id: node.id,
    name: node.title,
    trigger: dd.trigger as AutomationTrigger,
    actions: dd.actions as AutomationAction[],
    enabled: dd.enabled as boolean ?? false,
    userId: node.user_id,
    createdAt: dd.createdAt as string,
    updatedAt: dd.updatedAt as string,
    lastRunAt: dd.lastRunAt as string,
    lastRunStatus: dd.lastRunStatus as 'success' | 'error',
    lastRunError: dd.lastRunError as string,
  };
}

/** Convert an Automation to domain_data for storage */
export function automationToDomainData(automation: Omit<Automation, 'id' | 'userId'>): Record<string, unknown> {
  return {
    trigger: automation.trigger,
    actions: automation.actions,
    enabled: automation.enabled,
    createdAt: automation.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastRunAt: automation.lastRunAt ?? null,
    lastRunStatus: automation.lastRunStatus ?? null,
    lastRunError: automation.lastRunError ?? null,
  };
}
