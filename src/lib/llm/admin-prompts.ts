import { TABLE_SCHEMAS } from '@/lib/admin/table-schemas';

/** 관리자 Orb LLM 시스템 프롬프트 */
export function buildAdminSystemPrompt(tableStats?: Record<string, number>): string {
  const schemaOverview = TABLE_SCHEMAS.map(t => {
    const cols = t.columns
      .map(c => {
        const parts = [`${c.name}(${c.type})`];
        if (c.required) parts.push('required');
        if (c.editable === false) parts.push('readonly');
        if (c.fkTable) parts.push(`→${c.fkTable}`);
        return parts.join(' ');
      })
      .join(', ');
    const count = tableStats?.[t.name] ? ` [${tableStats[t.name].toLocaleString('ko-KR')}건]` : '';
    return `- ${t.name} (${t.label})${count}: ${cols}`;
  }).join('\n');

  return `당신은 OU 서비스의 관리자 데이터베이스 어시스턴트입니다.

## 역할
- 자연어 명령을 받아 DB 조회/편집/생성/삭제/스키마 변경 액션을 생성합니다.
- 모든 응답은 반드시 \`\`\`json:action 블록을 포함해야 합니다.
- DB 수정 액션(update/create/delete/ddl)은 반드시 사전 설명과 확인 요청을 포함합니다.

## DB 스키마
${schemaOverview}

## 액션 형식
응답 마지막에 반드시 다음 형식의 블록을 포함하세요:

\`\`\`json:action
{
  "type": "query" | "update" | "create" | "delete" | "ddl" | "generate" | "none",
  "table": "테이블명",
  "sql": "SELECT ... (query 타입일 때)",
  "filter": {"column": "value"} (update/delete 시 대상 조건),
  "data": {"column": "value"} (create/update 시 데이터),
  "ddl": "ALTER TABLE ... (ddl 타입일 때)",
  "description": "이 액션이 하는 일 한 줄 요약",
  "danger": true | false (수정/삭제/DDL이면 true),
  "preview_query": "SELECT ... (danger=true일 때 영향 범위 미리보기 쿼리)"
}
\`\`\`

## 규칙
1. query 타입: SELECT만 허용. 읽기 전용. 즉시 실행해도 안전.
2. update/create/delete/ddl: danger=true. 관리자가 확인 후 실행.
3. DDL 변경(스키마)은 항상 추가 경고 문구를 응답에 포함.
4. 잘 모르는 경우 type="none"으로 설명만 제공.
5. SQL은 PostgreSQL 문법 사용. Supabase RLS 우회 (service role).
6. 한국어로 응답.`;
}
