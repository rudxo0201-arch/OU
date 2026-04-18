#!/bin/bash
# scripts/ou-save-turn.sh
#
# UserPromptSubmit hook — 매 사용자 입력 시 이전 턴(직전 user+assistant)을 OU에 저장.
# transcript_path에서 마지막 대화 쌍을 읽어 원문 그대로 전송.

set -uo pipefail

OU_API_URL="${OU_API_URL:-https://ouuniverse.com}"

# API Key
if [ -z "${OU_API_KEY:-}" ]; then
  MCP_FILE="$(dirname "$0")/../.mcp.json"
  if [ -f "$MCP_FILE" ]; then
    OU_API_KEY=$(grep -o 'ou_sk_[a-f0-9]*' "$MCP_FILE" 2>/dev/null | head -1 || echo "")
  fi
fi

if [ -z "${OU_API_KEY:-}" ]; then
  exit 0
fi

# stdin에서 hook 컨텍스트 읽기
HOOK_INPUT=$(cat 2>/dev/null || echo '{}')

TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")
SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "")

if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

PROJECT_DIR="$(pwd)"
BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")

# transcript에서 마지막 user+assistant 쌍 추출
# 뒤에서부터 읽어서 가장 최근 assistant → 그 직전 user 찾기
LAST_ASSISTANT=$(tac "$TRANSCRIPT_PATH" 2>/dev/null | while IFS= read -r line; do
  TYPE=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)
  if [ "$TYPE" = "assistant" ]; then
    echo "$line"
    break
  fi
done)

LAST_USER=$(tac "$TRANSCRIPT_PATH" 2>/dev/null | while IFS= read -r line; do
  TYPE=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)
  if [ "$TYPE" = "user" ]; then
    echo "$line"
    break
  fi
done)

if [ -z "$LAST_USER" ] && [ -z "$LAST_ASSISTANT" ]; then
  exit 0
fi

# 메시지 내용 추출
USER_MSG=$(echo "$LAST_USER" | jq -r '
  if .message.content then
    if (.message.content | type) == "array" then
      [.message.content[] | select(.type == "text") | .text] | join("\n")
    elif (.message.content | type) == "string" then
      .message.content
    else ""
    end
  elif .message then
    if (.message | type) == "string" then .message else "" end
  else ""
  end
' 2>/dev/null || echo "")

ASSISTANT_MSG=$(echo "$LAST_ASSISTANT" | jq -r '
  if .message.content then
    if (.message.content | type) == "array" then
      [.message.content[] | select(.type == "text") | .text] | join("\n")
    elif (.message.content | type) == "string" then
      .message.content
    else ""
    end
  elif .message then
    if (.message | type) == "string" then .message else "" end
  else ""
  end
' 2>/dev/null || echo "")

if [ -z "$USER_MSG" ] && [ -z "$ASSISTANT_MSG" ]; then
  exit 0
fi

# 원문 그대로 OU에 저장
PAYLOAD=$(jq -n \
  --arg user_msg "$USER_MSG" \
  --arg assistant_msg "$ASSISTANT_MSG" \
  --arg session_id "$SESSION_ID" \
  --arg dir "$PROJECT_DIR" \
  --arg branch "$BRANCH" \
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
      save_type: "per_turn"
    }
  }')

# 백그라운드로 전송
curl -s -X POST "$OU_API_URL/api/ingest/conversation" \
  -H "Authorization: Bearer $OU_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" > /dev/null 2>&1 &

exit 0
