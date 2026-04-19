/**
 * MCP Endpoint (Stateless, Vercel-compatible)
 *
 * WebStandardStreamableHTTPServerTransport + stateless mode 사용.
 * 매 요청마다 새 transport + server 생성 → in-memory 세션 불필요.
 * Vercel serverless 환경에서 안정적으로 동작.
 */

import { NextRequest } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { resolveApiKeyUser } from '@/lib/auth/api-key';
import { createOUMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 인증
  const auth = await resolveApiKeyUser(req);
  if (!auth) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized: valid API key required' },
      id: null,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 매 요청 새 transport + server (stateless)
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  const server = createOUMcpServer(auth.userId);
  await server.connect(transport);

  return transport.handleRequest(req);
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}

export async function DELETE() {
  return new Response('Method Not Allowed', { status: 405 });
}
