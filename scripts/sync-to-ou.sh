#!/bin/bash
#
# sync-to-ou.sh — Claude Code 대화를 OU에 동기화
#
# 사용법:
#   ./scripts/sync-to-ou.sh                  # 현재 세션 동기화
#   ./scripts/sync-to-ou.sh <session-id>     # 특정 세션 동기화
#
# Claude Code 안에서:
#   ! ./scripts/sync-to-ou.sh
#

set -e

HISTORY_FILE="$HOME/.claude/history.jsonl"
OU_API="http://localhost:3000/api/ingest/conversation"

if [ ! -f "$HISTORY_FILE" ]; then
  echo "history.jsonl not found"
  exit 1
fi

# 세션 ID: 인자로 받거나, 가장 최근 세션 자동 감지
if [ -n "$1" ]; then
  SESSION_ID="$1"
else
  SESSION_ID=$(tail -1 "$HISTORY_FILE" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['sessionId'])")
fi

echo "Syncing session: $SESSION_ID"

# 해당 세션의 모든 사용자 메시지 추출 → JSON 배열로 변환
MESSAGES=$(python3 -c "
import sys, json

session_id = '$SESSION_ID'
history_file = '$HISTORY_FILE'

messages = []
with open(history_file, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line.strip())
            if entry.get('sessionId') == session_id:
                content = entry.get('display', '').strip()
                if content:
                    messages.append({
                        'role': 'user',
                        'content': content
                    })
        except:
            continue

# OU ingest API 형식
payload = {
    'messages': messages,
    'metadata': {
        'source': 'claude_code',
        'working_directory': entry.get('project', '') if messages else '',
        'session_id': session_id
    }
}

print(json.dumps(payload, ensure_ascii=False))
")

MSG_COUNT=$(echo "$MESSAGES" | python3 -c "import sys,json; print(len(json.loads(sys.stdin.read())['messages']))")
echo "Found $MSG_COUNT messages"

if [ "$MSG_COUNT" -eq 0 ]; then
  echo "No messages to sync"
  exit 0
fi

# OU API로 전송
# 주의: 인증이 필요합니다. 환경변수 OU_AUTH_TOKEN을 설정하거나,
# 로컬 개발 중이면 Supabase 토큰을 사용합니다.
if [ -n "$OU_AUTH_TOKEN" ]; then
  RESPONSE=$(echo "$MESSAGES" | curl -s -X POST "$OU_API" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OU_AUTH_TOKEN" \
    -d @-)
else
  # 로컬 개발: 쿠키 기반 인증 (브라우저에서 로그인 상태)
  RESPONSE=$(echo "$MESSAGES" | curl -s -X POST "$OU_API" \
    -H "Content-Type: application/json" \
    -d @-)
fi

echo "Response: $RESPONSE"
echo "Done!"
