/**
 * MCP SSE Endpoint
 *
 * Streamable HTTP transport로 MCP 클라이언트와 통신.
 * API Key 인증 → MCP 서버 연결 → 도구 호출 처리.
 *
 * POST: MCP 메시지 수신 (initialize, tool call 등)
 * GET:  SSE 스트림 (서버 → 클라이언트 알림)
 * DELETE: 세션 종료
 */

import { NextRequest } from 'next/server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { resolveApiKeyUser } from '@/lib/auth/api-key';
import { createOUMcpServer } from '@/lib/mcp/server';
import { randomUUID } from 'crypto';

// Node.js Runtime 강제 (MCP SDK가 Node.js API 필요)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 세션별 transport 관리
const sessions = new Map<string, StreamableHTTPServerTransport>();

async function authenticate(req: NextRequest) {
  const auth = await resolveApiKeyUser(req);
  if (!auth) return null;
  return auth;
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
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

  // 세션 ID 확인
  const sessionId = req.headers.get('mcp-session-id');
  let transport: StreamableHTTPServerTransport;

  if (sessionId && sessions.has(sessionId)) {
    // 기존 세션 재사용
    transport = sessions.get(sessionId)!;
  } else {
    // 새 세션 생성
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
      },
    });

    // MCP 서버 연결 (auth 정보를 transport에 전달)
    const server = createOUMcpServer();

    // auth 정보를 extra에 주입하기 위해 transport의 authInfo 설정
    (transport as any)._authInfo = {
      token: '',
      clientId: auth.keyId,
      scopes: ['mcp:read', 'mcp:write'],
      extra: { userId: auth.userId },
    };

    await server.connect(transport);
  }

  // MCP 메시지 처리
  const body = await req.json();

  // Node.js 호환 응답 객체 생성
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  // transport에 authInfo 전달
  const nodeReq = {
    method: 'POST',
    headers: req.headers,
    body,
    auth: (transport as any)._authInfo,
  };

  const nodeRes = {
    writeHead: (status: number, h?: Record<string, string>) => {
      if (h) Object.assign(headers, h);
      return nodeRes;
    },
    write: (chunk: string) => {
      writer.write(encoder.encode(chunk));
      return true;
    },
    end: (data?: string) => {
      if (data) writer.write(encoder.encode(data));
      writer.close();
    },
    on: () => nodeRes,
    setHeader: (key: string, value: string) => { headers[key] = value; },
    getHeader: (key: string) => headers[key],
    flushHeaders: () => {},
    statusCode: 200,
  };

  await transport.handleRequest(nodeReq as any, nodeRes as any, body);

  // SSE 응답인지 JSON 응답인지 확인
  if (headers['Content-Type']?.includes('text/event-stream')) {
    return new Response(readable, { headers });
  }

  // JSON 응답 (non-streaming)
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  // 청크 합치기
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  const responseText = new TextDecoder().decode(merged);

  return new Response(responseText, {
    status: nodeRes.statusCode,
    headers: {
      'Content-Type': headers['Content-Type'] || 'application/json',
      ...(headers['Mcp-Session-Id'] ? { 'Mcp-Session-Id': headers['Mcp-Session-Id'] } : {}),
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sessionId = req.headers.get('mcp-session-id');
  if (!sessionId || !sessions.has(sessionId)) {
    return new Response('Session not found. Send a POST request to initialize first.', { status: 400 });
  }

  const transport = sessions.get(sessionId)!;
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const nodeRes = {
    writeHead: () => nodeRes,
    write: (chunk: string) => { writer.write(encoder.encode(chunk)); return true; },
    end: () => { writer.close(); },
    on: () => nodeRes,
    setHeader: () => {},
    getHeader: () => undefined,
    flushHeaders: () => {},
    statusCode: 200,
  };

  const nodeReq = {
    method: 'GET',
    headers: req.headers,
    auth: (transport as any)._authInfo,
  };

  await transport.handleRequest(nodeReq as any, nodeRes as any);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.headers.get('mcp-session-id');
  if (sessionId) {
    const transport = sessions.get(sessionId);
    if (transport) {
      await transport.close();
      sessions.delete(sessionId);
    }
  }
  return new Response(null, { status: 204 });
}
