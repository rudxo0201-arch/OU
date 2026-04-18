import { createClient } from '@/lib/supabase/server';

/**
 * Resolve Agent
 *
 * Takes an unresolved entity (e.g., "걔", "거기", "내일") and attempts
 * auto-resolution using context from surrounding messages and user's data_nodes.
 * Only resolves with HIGH confidence to avoid incorrect mappings.
 */

interface UnresolvedEntity {
  id: string;
  user_id: string;
  raw_text: string;
  context_snippet: string | null;
  placeholder_node_id: string | null;
}

interface ResolveResult {
  resolved: boolean;
  value: string | null;
  confidence: number;
  method: 'context_node' | 'time_context' | 'common_knowledge' | null;
}

const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Time-based patterns: resolve relative time expressions
 * using the message creation timestamp as anchor.
 */
const TIME_PATTERNS: Array<{
  pattern: RegExp;
  resolve: (anchorDate: Date) => string;
}> = [
  {
    pattern: /^내일$/,
    resolve: (d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next.toISOString().split('T')[0];
    },
  },
  {
    pattern: /^모레$/,
    resolve: (d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 2);
      return next.toISOString().split('T')[0];
    },
  },
  {
    pattern: /^어제$/,
    resolve: (d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev.toISOString().split('T')[0];
    },
  },
  {
    pattern: /^그저께$/,
    resolve: (d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 2);
      return prev.toISOString().split('T')[0];
    },
  },
  {
    pattern: /^다음\s*주$/,
    resolve: (d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return `${next.toISOString().split('T')[0]} week`;
    },
  },
  {
    pattern: /^지난\s*주$/,
    resolve: (d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 7);
      return `${prev.toISOString().split('T')[0]} week`;
    },
  },
];

/**
 * Try to resolve a time-based expression using the message date as anchor.
 */
function tryResolveTime(
  rawText: string,
  messageDate: Date | null,
): ResolveResult {
  if (!messageDate) return { resolved: false, value: null, confidence: 0, method: null };

  for (const { pattern, resolve } of TIME_PATTERNS) {
    if (pattern.test(rawText.trim())) {
      return {
        resolved: true,
        value: resolve(messageDate),
        confidence: 0.95,
        method: 'time_context',
      };
    }
  }

  return { resolved: false, value: null, confidence: 0, method: null };
}

/**
 * Try to resolve a pronoun by searching for recent data_nodes
 * that match the entity type (person, location, thing, event).
 */
async function tryResolveFromContext(
  entity: UnresolvedEntity,
  contextSnippetParsed: Array<{ role: string; text: string }>,
): Promise<ResolveResult> {
  const supabase = await createClient();

  // Determine entity type from raw_text
  const personPatterns = /^(걔|걔네|그 사람|그분|그녀|그|쟤)$/;
  const locationPatterns = /^(거기|그곳|저기|거기서)$/;

  let domainFilter: string[] | null = null;
  if (personPatterns.test(entity.raw_text)) {
    domainFilter = ['relation'];
  } else if (locationPatterns.test(entity.raw_text)) {
    domainFilter = ['location'];
  }

  // Search recent user nodes for matching domain
  let query = supabase
    .from('data_nodes')
    .select('id, raw, domain, domain_data, created_at')
    .eq('user_id', entity.user_id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (domainFilter) {
    query = query.in('domain', domainFilter);
  }

  const { data: recentNodes } = await query;
  if (!recentNodes?.length) {
    return { resolved: false, value: null, confidence: 0, method: null };
  }

  // Build context string from the conversation snippet
  const contextText = contextSnippetParsed
    .map((m) => m.text)
    .join(' ')
    .toLowerCase();

  // Simple heuristic: check if any recent node's raw text appears in the context
  for (const node of recentNodes) {
    const nodeRaw = (node.raw ?? '').toLowerCase();
    if (!nodeRaw) continue;

    // Check if any significant word from the node appears near the pronoun in context
    const nodeWords = nodeRaw
      .split(/\s+/)
      .filter((w: string) => w.length > 1);

    let matchCount = 0;
    for (const word of nodeWords) {
      if (contextText.includes(word)) matchCount++;
    }

    const matchRatio = nodeWords.length > 0 ? matchCount / nodeWords.length : 0;

    if (matchRatio >= 0.5 && matchCount >= 2) {
      return {
        resolved: true,
        value: node.raw,
        confidence: Math.min(0.9, 0.7 + matchRatio * 0.2),
        method: 'context_node',
      };
    }
  }

  return { resolved: false, value: null, confidence: 0, method: null };
}

/**
 * Main entry point: attempt to resolve an unresolved entity.
 * Returns the result without side effects if dryRun is true.
 */
export async function resolveEntity(
  entity: UnresolvedEntity,
  options?: { dryRun?: boolean; messageDate?: Date },
): Promise<ResolveResult> {
  // Parse context_snippet (stored as JSON string or array)
  let contextSnippetParsed: Array<{ role: string; text: string }> = [];
  if (entity.context_snippet) {
    try {
      const parsed = JSON.parse(entity.context_snippet);
      contextSnippetParsed = Array.isArray(parsed) ? parsed : [];
    } catch {
      // context_snippet might be plain text
      contextSnippetParsed = [{ role: 'context', text: entity.context_snippet }];
    }
  }

  // 1. Try time-based resolution
  const timeResult = tryResolveTime(
    entity.raw_text,
    options?.messageDate ?? new Date(),
  );
  if (timeResult.resolved && timeResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    if (!options?.dryRun) {
      await persistResolution(entity, timeResult);
    }
    return timeResult;
  }

  // 2. Try context-based resolution (matching nearby data_nodes)
  const contextResult = await tryResolveFromContext(entity, contextSnippetParsed);
  if (contextResult.resolved && contextResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    if (!options?.dryRun) {
      await persistResolution(entity, contextResult);
    }
    return contextResult;
  }

  // 3. If nothing resolved with high confidence, return null
  return { resolved: false, value: null, confidence: 0, method: null };
}

/**
 * Persist the resolution to the database.
 */
async function persistResolution(
  entity: UnresolvedEntity,
  result: ResolveResult,
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('unresolved_entities')
    .update({
      resolution_status: 'auto',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', entity.id);

  // Update linked data_node's domain_data with resolved value
  if (entity.placeholder_node_id && result.value) {
    const { data: node } = await supabase
      .from('data_nodes')
      .select('domain_data')
      .eq('id', entity.placeholder_node_id)
      .single();

    if (node) {
      const domainData = (node.domain_data as Record<string, unknown>) ?? {};
      const resolvedEntities =
        (domainData.resolved_entities as Record<string, string>) ?? {};
      resolvedEntities[entity.id] = result.value;

      await supabase
        .from('data_nodes')
        .update({
          domain_data: {
            ...domainData,
            resolved_entities: resolvedEntities,
            auto_resolve_method: result.method,
          },
        })
        .eq('id', entity.placeholder_node_id);
    }
  }
}

/**
 * Batch process: find all pending unresolved entities for a user
 * and attempt auto-resolution.
 */
export async function resolveAllPending(userId: string): Promise<{
  attempted: number;
  resolved: number;
}> {
  const supabase = await createClient();

  const { data: entities } = await supabase
    .from('unresolved_entities')
    .select('id, user_id, raw_text, context_snippet, placeholder_node_id')
    .eq('user_id', userId)
    .eq('resolution_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (!entities?.length) return { attempted: 0, resolved: 0 };

  let resolved = 0;
  for (const entity of entities) {
    const result = await resolveEntity(entity as UnresolvedEntity);
    if (result.resolved) resolved++;
  }

  return { attempted: entities.length, resolved };
}
