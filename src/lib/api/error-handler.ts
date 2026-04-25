import { DOMAINS } from '@/lib/ou-registry';
import { NextResponse } from 'next/server';
import { COPY } from '@/lib/copy';

/**
 * 안전한 API 에러 응답
 * 내부 구조 노출 없이 사용자 친화적 메시지 반환
 * 서버 사이드에서만 상세 에러를 로깅
 */
export function safeErrorResponse(
  error: unknown,
  status = 500,
  userMessage?: string,
): NextResponse {
  // 서버 로그에는 전체 에러 기록
  if (process.env.NODE_ENV === DOMAINS.DEVELOPMENT) {
    console.error('[API Error]', error);
  }

  const message = userMessage ?? (
    status === 401 ? COPY.error.unauthorized :
    status === 404 ? COPY.error.not_found :
    COPY.error.generic
  );

  return NextResponse.json({ message }, { status });
}

/**
 * API 라우트 래퍼: try-catch + 안전한 에러 응답
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<NextResponse>,
): (req: Request) => Promise<NextResponse> {
  return async (req) => {
    try {
      return await handler(req);
    } catch (error) {
      return safeErrorResponse(error);
    }
  };
}
