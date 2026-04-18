#!/usr/bin/env python3
"""
scripts/import-claude-history.py

Claude Code 이전 대화 기록(.jsonl)을 OU에 일괄 임포트한다.
각 대화 턴(user+assistant)을 /api/ingest/conversation 엔드포인트로 전송.

사용법:
  python3 scripts/import-claude-history.py [--dry-run] [--limit N]
"""

import json
import os
import sys
import time
import argparse
import glob
import requests

HISTORY_DIR = os.path.expanduser(
    "~/.claude/projects/-Users-kt-Desktop-claude-OU-Real-ou-web"
)
API_URL = "https://ouuniverse.com/api/ingest/conversation"
API_KEY = "ou_sk_64e351668a9dc6c25cd285634bde531d532cac735543de6ae98867172af27fe1"


def extract_text_content(content):
    """content 필드에서 텍스트만 추출 (thinking, tool_use 제외)"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                texts.append(block.get("text", ""))
        return "\n".join(texts)
    return ""


def parse_conversation(jsonl_path):
    """JSONL 파일에서 user/assistant 메시지 쌍 추출"""
    turns = []
    current_user = None

    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            msg_type = obj.get("type", "")

            # user 또는 assistant 메시지만 처리
            if msg_type not in ("user", "assistant"):
                continue

            message = obj.get("message", {})
            role = message.get("role", "")
            content = extract_text_content(message.get("content", ""))

            if not content or not content.strip():
                continue

            if role == "user":
                # 이전 user가 있으면 assistant 없이 저장
                if current_user:
                    turns.append({"user": current_user, "assistant": ""})
                current_user = content.strip()
            elif role == "assistant" and current_user:
                turns.append({"user": current_user, "assistant": content.strip()})
                current_user = None

    # 마지막 user 메시지가 짝이 없으면
    if current_user:
        turns.append({"user": current_user, "assistant": ""})

    return turns


def send_to_ou(turns, session_id, dry_run=False):
    """턴을 OU에 전송 (한 세션의 모든 턴을 한 번에)"""
    if not turns:
        return 0

    # 턴이 너무 많으면 10턴씩 묶어서 전송
    batch_size = 10
    sent = 0

    for i in range(0, len(turns), batch_size):
        batch = turns[i : i + batch_size]
        messages = []
        for turn in batch:
            messages.append({"role": "user", "content": turn["user"][:5000]})
            if turn["assistant"]:
                messages.append(
                    {"role": "assistant", "content": turn["assistant"][:5000]}
                )

        payload = {
            "messages": messages,
            "metadata": {
                "source": "claude_code_history",
                "session_id": session_id,
                "working_directory": "/Users/kt/Desktop/claude/OU_Real/ou-web",
            },
        }

        if dry_run:
            print(
                f"  [DRY] batch {i // batch_size + 1}: {len(messages)} messages, "
                f"user preview: {messages[0]['content'][:60]}..."
            )
            sent += len(batch)
            continue

        try:
            resp = requests.post(
                API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            if resp.status_code == 200:
                result = resp.json()
                print(
                    f"  batch {i // batch_size + 1}: "
                    f"nodeId={result.get('nodeId', '?')}, "
                    f"domain={result.get('domain', '?')}"
                )
                sent += len(batch)
            else:
                print(f"  batch {i // batch_size + 1}: ERROR {resp.status_code} - {resp.text[:200]}")
            # rate limiting
            time.sleep(1)
        except Exception as e:
            print(f"  batch {i // batch_size + 1}: FAILED - {e}")

    return sent


def main():
    parser = argparse.ArgumentParser(description="Import Claude Code history to OU")
    parser.add_argument("--dry-run", action="store_true", help="미리보기만 (전송 안 함)")
    parser.add_argument("--limit", type=int, default=0, help="처리할 세션 수 제한")
    args = parser.parse_args()

    jsonl_files = sorted(glob.glob(os.path.join(HISTORY_DIR, "*.jsonl")))
    if not jsonl_files:
        print("대화 기록 파일을 찾을 수 없습니다.")
        sys.exit(1)

    print(f"총 {len(jsonl_files)}개 세션 발견\n")

    total_turns = 0
    total_sent = 0

    for idx, fpath in enumerate(jsonl_files):
        if args.limit and idx >= args.limit:
            break

        session_id = os.path.basename(fpath).replace(".jsonl", "")
        size_mb = os.path.getsize(fpath) / (1024 * 1024)
        turns = parse_conversation(fpath)

        print(f"[{idx + 1}/{len(jsonl_files)}] {session_id[:8]}... ({size_mb:.1f}MB, {len(turns)} turns)")

        if not turns:
            print("  skip: 텍스트 메시지 없음")
            continue

        total_turns += len(turns)
        sent = send_to_ou(turns, session_id, dry_run=args.dry_run)
        total_sent += sent

    print(f"\n완료: {total_sent}/{total_turns} turns 전송됨")


if __name__ == "__main__":
    main()
