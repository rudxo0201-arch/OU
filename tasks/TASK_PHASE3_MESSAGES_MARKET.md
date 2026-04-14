# 작업 지시서 — Phase 3 Step 2: OU 채팅 (/messages) + Step 3: 크리에이터 마켓

> 선행 조건: TASK_PHASE3_FEED.md 완료
> 완료 기준: DataView 메시지 전송 + 마켓플레이스 뷰 거래

---

## 사전 읽기

```
PLATFORM.md    레이어 5(OU 채팅), 언어 중립 렌더링
               레이어 6(크리에이터 이코노미)
BUSINESS.md    Phase 3 크리에이터 수익, 마켓플레이스 수수료
```

---

## 파트 A: OU 채팅 (/messages)

### 핵심 차이
```
기존 카톡: 이미지/파일/텍스트 전송
OU 채팅:   DataView 전송 → 채팅창에 렌더링

언어 중립:
  보내는 것: DataNode (언어 중립 데이터)
  받는 것:   각자 언어 설정으로 렌더링
```

### 구현 목록
```
[ ] /messages 채팅방 목록
[ ] /messages/[roomId] 채팅방
[ ] DataNode 메시지 전송
[ ] ViewRenderer 채팅창 인라인 렌더링
[ ] Supabase Realtime 실시간 메시지
[ ] 텍스트 메시지 (기본)
```

---

### Step A-1. 채팅방 테이블

```sql
-- Supabase SQL Editor에서 실행
CREATE TABLE chat_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_room_members (
  room_id  UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES profiles(id),
  content     TEXT,                    -- 텍스트 메시지
  node_id     UUID REFERENCES data_nodes(id), -- DataNode 메시지
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_members_only" ON chat_messages
  FOR ALL USING (
    room_id IN (
      SELECT room_id FROM chat_room_members WHERE user_id = auth.uid()
    )
  );
```

---

### Step A-2. /messages 페이지

```typescript
// src/app/(private)/messages/page.tsx
import { createClient } from '@/lib/supabase/server';
import { MessagesClient } from './MessagesClient';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rooms } = await supabase
    .from('chat_room_members')
    .select('room_id, chat_rooms(*)')
    .eq('user_id', user!.id);

  return <MessagesClient rooms={rooms ?? []} />;
}
```

### Step A-3. 채팅방 실시간

```typescript
// src/app/(private)/messages/[roomId]/ChatRoom.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Stack, TextInput, ActionIcon, Box, Paper, Text, Group } from '@mantine/core';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';

export function ChatRoom({ roomId, userId }: { roomId: string; userId: string }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  // 초기 메시지 로드
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('*, profiles(display_name), data_nodes(*)')
      .eq('room_id', roomId)
      .order('created_at')
      .then(({ data }) => setMessages(data ?? []));

    // Supabase Realtime 구독
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: input,
    });
    setInput('');
  };

  return (
    <Stack h="100vh" gap={0}>
      {/* 메시지 목록 */}
      <Stack flex={1} gap="sm" p="md" style={{ overflowY: 'auto' }}>
        {messages.map(msg => (
          <Box key={msg.id} style={{ alignSelf: msg.sender_id === userId ? 'flex-end' : 'flex-start' }}>
            <Paper p="sm" maw={400}>
              {/* 텍스트 메시지 */}
              {msg.content && <Text fz="sm">{msg.content}</Text>}

              {/* DataNode 메시지 → ViewRenderer로 렌더링 */}
              {/* 언어 중립: 받는 사람 언어로 렌더링 */}
              {msg.data_nodes && DOMAIN_VIEW_MAP[msg.data_nodes.domain] && (
                <ViewRenderer
                  viewType={DOMAIN_VIEW_MAP[msg.data_nodes.domain]}
                  nodes={[msg.data_nodes]}
                  inline
                />
              )}
            </Paper>
          </Box>
        ))}
      </Stack>

      {/* 입력창 */}
      <Group p="md" style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}>
        <TextInput
          flex={1}
          placeholder="메시지 입력..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          radius="xl"
        />
        <ActionIcon size="lg" radius="xl" onClick={sendMessage}>
          <PaperPlaneRight size={18} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
```

---

## 파트 B: 크리에이터 마켓플레이스

### 구현 목록
```
[ ] /market 마켓플레이스 페이지
[ ] 뷰 템플릿 판매 등록
[ ] 뷰 구매 → 구매자 DataNode 자동 매핑
[ ] 조회수 기반 수익 계산
[ ] 크리에이터 수익 대시보드
```

---

### Step B-1. 마켓 테이블

```sql
CREATE TABLE market_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID REFERENCES profiles(id),
  view_id       UUID REFERENCES saved_views(id),
  name          TEXT NOT NULL,
  description   TEXT,
  price_krw     INTEGER DEFAULT 0,  -- 0 = 무료
  thumbnail_url TEXT,
  purchase_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE market_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID REFERENCES market_items(id),
  buyer_id    UUID REFERENCES profiles(id),
  price_paid  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Step B-2. /market 페이지

```typescript
// src/app/(public)/market/page.tsx
// 공개된 DataView 템플릿 목록
// 무료/유료 필터
// 구매 → saved_views에 복사 + DataNode 자동 매핑
// Sidebar에 마켓 아이콘 추가
```

### Step B-3. 크리에이터 수익 대시보드

```typescript
// src/app/(private)/creator/page.tsx
// 내가 판매 중인 뷰 목록
// 조회수 / 구매수 / 수익 (OU 20% 수수료 제외)
// 출금 요청 (Phase 4)
```

---

## 완료 체크리스트

```
파트 A — OU 채팅:
[ ] /messages 채팅방 목록
[ ] 채팅방 실시간 메시지 (Supabase Realtime)
[ ] DataNode 메시지 → ViewRenderer 인라인 렌더링
[ ] Sidebar /messages 아이콘 활성화

파트 B — 마켓플레이스:
[ ] /market 뷰 템플릿 목록
[ ] 무료 뷰 다운로드 → 내 saved_views에 추가
[ ] 유료 뷰 구매 (Stripe)
[ ] /creator 수익 대시보드

[ ] pnpm build 통과
[ ] git commit: "feat: OU 채팅 + 크리에이터 마켓플레이스"
```

---

## 다음 작업

**TASK_PHASE3_B2B.md** → B2B 교육 Team 플랜
