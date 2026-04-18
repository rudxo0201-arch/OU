#!/bin/bash
# scripts/ou-ingest.sh
#
# Claude Code Stop hook — 세션의 전체 대화를 OU에 저장한다.
# transcript_path에서 JSONL을 읽어 user/assistant 쌍을 개별 저장.
# 요약이 아닌 원문 전체 저장.

set -uo pipefail

OU_API_URL="${OU_API_URL:-https://ouuniverse.com}"

# API Key: 환경변수 우선, 없으면 .mcp.json에서 추출
if [ -z "${OU_API_KEY:-}" ]; then
  MCP_FILE="$(dirname "$0")/../.mcp.json"
  if [ -f "$MCP_FILE" ]; then
    OU_API_KEY=$(grep -o 'ou_sk_[a-f0-9]*' "$MCP_FILE" 2>/dev/null | head -1 || echo "")
  fi
fi

if [ -z "${OU_API_KEY:-}" ]; then
  exit 0
fi

PROJECT_DIR="$(pwd)"
BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")
COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "")

# stdin에서 Stop hook 컨텍스트 읽기
STOP_INPUT=$(cat 2>/dev/null || echo '{}')

# transcript_path 추출
TRANSCRIPT_PATH=$(echo "$STOP_INPUT" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")
SESSION_ID=$(echo "$STOP_INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "")

# transcript 파일이 있으면 전체 대화 저장
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # JSONL에서 user/assistant 메시지 쌍 추출하여 개별 저장
  # jq로 user 메시지와 assistant 메시지를 쌍으로 묶어서 전송
  jq -r -s '
    # JSONL의 각 라인에서 role과 content 추출
    [.[] | select(.type == "user" or .type == "assistant") |
     {
       role: .type,
       content: (
         if .message.content then
           if (.message.content | type) == "array" then
             [.message.content[] | select(.type == "text") | .text] | join("\n")
           elif (.message.content | type) == "string" then
             .message.content
           else
             ""
           end
         elif .message then
           if (.message | type) == "string" then
             .message
           else
             ""
           end
         else
           ""
         end
       )
     } | select(.content != "" and .content != null)
    ] |
    # user/assistant 쌍으로 묶기
    reduce .[] as $msg (
      {pairs: [], current_user: null};
      if $msg.role == "user" then
        if .current_user then
          .pairs += [{user: .current_user, assistant: ""}] | .current_user = $msg.content
        else
          .current_user = $msg.content
        end
      elif $msg.role == "assistant" then
        .pairs += [{user: (.current_user // ""), assistant: $msg.content}] | .current_user = null
      else . end
    ) |
    if .current_user then .pairs += [{user: .current_user, assistant: ""}] else . end |
    .pairs
  ' "$TRANSCRIPT_PATH" 2>/dev/null | jq -c '.[]' 2>/dev/null | while IFS= read -r pair; do
    USER_MSG=$(echo "$pair" | jq -r '.user')
    ASSISTANT_MSG=$(echo "$pair" | jq -r '.assistant')

    # 빈 메시지 스킵
    if [ -z "$USER_MSG" ] && [ -z "$ASSISTANT_MSG" ]; then
      continue
    fi

    # 원문 그대로 저장 — 잘림 없음
    PAYLOAD=$(jq -n \
      --arg user_msg "$USER_MSG" \
      --arg assistant_msg "$ASSISTANT_MSG" \
      --arg dir "$PROJECT_DIR" \
      --arg branch "$BRANCH" \
      --arg commit "$COMMIT" \
      --arg session_id "$SESSION_ID" \
      '{
        messages: [
          { role: "user", content: $user_msg },
          { role: "assistant", content: $assistant_msg }
        ],
        metadata: {
          source: "claude_code",
          session_id: $session_id,
          working_directory: $dir,
          branch: $branch,
          commit_hash: $commit
        }
      }')

    curl -s -X POST "$OU_API_URL/api/ingest/conversation" \
      -H "Authorization: Bearer $OU_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" > /dev/null 2>&1
  done &
fi

exit 0
