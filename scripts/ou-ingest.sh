#!/bin/bash
# scripts/ou-ingest.sh
#
# Claude Code Stop hook에서 호출되어 개발 세션을 OU에 DataNode로 저장한다.
# 환경변수: OU_API_KEY (필수, ou_sk_* 형식), OU_API_URL (선택)

set -euo pipefail

OU_API_URL="${OU_API_URL:-https://ouuniverse.com}"

# API Key: 환경변수 우선, 없으면 .mcp.json에서 추출
if [ -z "${OU_API_KEY:-}" ]; then
  MCP_FILE="$(dirname "$0")/../.mcp.json"
  if [ -f "$MCP_FILE" ]; then
    OU_API_KEY=$(grep -o 'ou_sk_[a-f0-9]*' "$MCP_FILE" 2>/dev/null | head -1 || echo "")
  fi
fi

# API Key 없으면 조용히 종료
if [ -z "$OU_API_KEY" ]; then
  exit 0
fi

PROJECT_DIR="$(pwd)"
BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")
COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "")
DIFF_STAT=$(git -C "$PROJECT_DIR" diff --stat HEAD~1 2>/dev/null | tail -1 || echo "")

# 변경된 파일 목록 (최대 20개)
FILES_JSON=$(git -C "$PROJECT_DIR" diff --name-only HEAD~1 2>/dev/null | head -20 | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo '[]')

# stdin에서 Stop hook 컨텍스트 읽기
STOP_INPUT=$(cat 2>/dev/null || echo '{}')

# 세션 요약 구성
SESSION_SUMMARY=$(echo "$STOP_INPUT" | jq -r '
  .transcript_summary // .stop_hook_data // "개발 세션 자동 저장"
' 2>/dev/null || echo "개발 세션 자동 저장")

# JSON 페이로드 구성
PAYLOAD=$(jq -n \
  --arg summary "$SESSION_SUMMARY" \
  --arg dir "$PROJECT_DIR" \
  --arg branch "$BRANCH" \
  --arg commit "$COMMIT" \
  --arg diff_stat "$DIFF_STAT" \
  --argjson files "$FILES_JSON" \
  '{
    messages: [
      { role: "user", content: ("OU 개발 세션 [" + $branch + "] " + $dir) },
      { role: "assistant", content: $summary }
    ],
    metadata: {
      source: "claude_code",
      working_directory: $dir,
      files_changed: $files,
      git_diff_summary: $diff_stat,
      commit_hash: $commit,
      branch: $branch
    }
  }')

# 백그라운드로 API 호출 (Claude Code 흐름 차단 방지)
curl -s -X POST "$OU_API_URL/api/ingest/conversation" \
  -H "Authorization: Bearer $OU_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" > /dev/null 2>&1 &

exit 0
