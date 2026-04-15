import { createClient } from '@/lib/supabase/server';

const UNRESOLVED_PATTERNS = [
  { pattern: /\b(걔|걔네|그 사람|그분|그녀|그|쟤)\b/g, type: 'person' },
  { pattern: /\b(거기|그곳|저기|거기서)\b/g, type: 'location' },
  { pattern: /\b(그것|그거|그게|그걸|이것|이거)\b/g, type: 'thing' },
  { pattern: /\b(그 일|그 얘기|그때 일|그 사건)\b/g, type: 'event' },
];

interface DetectInput {
  userId?: string;
  nodeId: string;
  text: string;
  contextSnippet: Array<{ role: string; text: string }>;
}

export async function detectUnresolved(input: DetectInput) {
  if (!input.userId) return;

  const supabase = await createClient();
  const found: Array<{ raw: string; type: string }> = [];

  for (const { pattern, type } of UNRESOLVED_PATTERNS) {
    const matches = input.text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!found.find(f => f.raw === match)) {
          found.push({ raw: match, type });
        }
      });
    }
  }

  if (found.length === 0) return;

  await supabase.from('unresolved_entities').insert(
    found.map(f => ({
      user_id: input.userId,
      node_id: input.nodeId,
      raw_text: f.raw,
      context_snippet: input.contextSnippet,
      resolution_status: 'pending',
    }))
  );
}
