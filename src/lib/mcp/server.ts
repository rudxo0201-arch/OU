/**
 * OU MCP Server
 *
 * 외부 AI 클라이언트(Claude Code, claude.ai 등)의 대화를
 * 자동으로 OU에 수집하는 MCP 서버.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ingestConversation } from '@/lib/pipeline/ingest-conversation';
import { searchUserData } from '@/lib/search/inline';

export function createOUMcpServer() {
  const server = new McpServer({
    name: 'ou-universe',
    version: '1.0.0',
  });

  // ── Tool: record_message ──
  // 기록 + 관련 컨텍스트 자동 반환
  server.tool(
    'record_message',
    'Record a message AND receive related context from the user\'s OU universe. ALWAYS call this after every response — you will receive relevant past conversations and knowledge that helps you give better, more contextual answers. This is essential for maintaining conversation continuity across sessions.',
    {
      user_message: z.string().describe('The user\'s message'),
      assistant_message: z.string().describe('The assistant\'s response (summary, under 200 chars)'),
      source: z.string().optional().describe('Client name: claude_code, claude_ai, chatgpt, etc.'),
      session_id: z.string().optional().describe('Session ID to group related messages'),
    },
    async ({ user_message, assistant_message, source, session_id }, extra) => {
      const userId = (extra as any).authInfo?.extra?.userId;
      if (!userId) {
        return { content: [{ type: 'text' as const, text: 'Authentication required' }], isError: true };
      }

      try {
        const supabase = createAdminClient();

        // 1. 기록
        const result = await ingestConversation({
          userId,
          messages: [
            { role: 'user', content: user_message },
            { role: 'assistant', content: assistant_message },
          ],
          metadata: { source: source ?? 'mcp', session_id },
          sourceType: 'mcp',
          messageType: 'mcp_session',
          supabase,
        });

        // 2. 관련 컨텍스트 자동 검색 — 다음 응답에 활용할 수 있도록
        const related = await searchUserData(supabase, userId, user_message, 3)
          .catch(() => []);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              recorded: true,
              nodeId: result.nodeId,
              domain: result.domain,
              viewHint: result.viewHint,
              related_context: related.map(r => ({
                domain: r.domain,
                raw: r.raw?.slice(0, 300),
                created_at: r.created_at,
              })),
            }),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `Record failed: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool: record_conversation ──
  // 대화 전체 배치 기록 (내보내기 데이터 수집용)
  server.tool(
    'record_conversation',
    'Record a full conversation (multiple message pairs) into the OU universe. Use for importing conversation exports.',
    {
      messages: z.array(z.object({
        role: z.string().describe('user or assistant'),
        content: z.string(),
      })).describe('Array of messages in chronological order'),
      source: z.string().optional().describe('Source client name'),
      session_id: z.string().optional().describe('Session ID'),
    },
    async ({ messages, source, session_id }, extra) => {
      const userId = (extra as any).authInfo?.extra?.userId;
      if (!userId) {
        return { content: [{ type: 'text' as const, text: 'Authentication required' }], isError: true };
      }

      try {
        const supabase = createAdminClient();

        // 메시지를 user/assistant 쌍으로 그룹핑
        const pairs: Array<{ user: string; assistant: string }> = [];
        let currentUser = '';

        for (const msg of messages) {
          if (msg.role === 'user' || msg.role === 'human') {
            if (currentUser && pairs.length === 0) {
              // 이전 user 메시지에 assistant 응답이 없었음
              pairs.push({ user: currentUser, assistant: '' });
            }
            currentUser = msg.content;
          } else if (msg.role === 'assistant') {
            pairs.push({ user: currentUser || '(no user message)', assistant: msg.content });
            currentUser = '';
          }
        }
        if (currentUser) pairs.push({ user: currentUser, assistant: '' });

        const results = [];
        for (const pair of pairs) {
          const result = await ingestConversation({
            userId,
            messages: [
              { role: 'user', content: pair.user },
              { role: 'assistant', content: pair.assistant },
            ],
            metadata: { source: source ?? 'mcp', session_id },
            sourceType: 'mcp',
            messageType: 'mcp_session',
            supabase,
          });
          results.push(result);
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              recorded: true,
              count: results.length,
              nodeIds: results.map(r => r.nodeId),
              domains: results.map(r => r.domain),
            }),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `Batch record failed: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool: search_universe ──
  // 회원의 우주에서 검색
  server.tool(
    'search_universe',
    'Search the user\'s OU universe for relevant data nodes. MUST be called before every response to retrieve the user\'s past conversations, decisions, and knowledge. This enables continuity across sessions — without this, you lose all prior context.',
    {
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Max results (default 5)'),
    },
    async ({ query, limit }, extra) => {
      const userId = (extra as any).authInfo?.extra?.userId;
      if (!userId) {
        return { content: [{ type: 'text' as const, text: 'Authentication required' }], isError: true };
      }

      try {
        const supabase = createAdminClient();
        const results = await searchUserData(supabase, userId, query, limit ?? 5);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              count: results.length,
              nodes: results.map(r => ({
                id: r.id,
                domain: r.domain,
                raw: r.raw?.slice(0, 500),
                created_at: r.created_at,
              })),
            }),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `Search failed: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool: get_context ──
  // 주제 관련 DataNode + 트리플 반환
  server.tool(
    'get_context',
    'Get relevant context from the user\'s OU universe, including data nodes and their knowledge graph triples.',
    {
      topic: z.string().describe('Topic to get context for'),
      max_nodes: z.number().optional().describe('Max nodes to return (default 3)'),
    },
    async ({ topic, max_nodes }, extra) => {
      const userId = (extra as any).authInfo?.extra?.userId;
      if (!userId) {
        return { content: [{ type: 'text' as const, text: 'Authentication required' }], isError: true };
      }

      try {
        const supabase = createAdminClient();
        const nodes = await searchUserData(supabase, userId, topic, max_nodes ?? 3);

        if (nodes.length === 0) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ nodes: [], triples: [] }) }],
          };
        }

        // 관련 트리플 가져오기
        const nodeIds = nodes.map(n => n.id);
        const { data: triples } = await supabase
          .from('triples')
          .select('subject, predicate, object, confidence')
          .in('node_id', nodeIds)
          .limit(20);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              nodes: nodes.map(n => ({
                id: n.id,
                domain: n.domain,
                raw: n.raw?.slice(0, 500),
                created_at: n.created_at,
              })),
              triples: triples ?? [],
            }),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `Context failed: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}
