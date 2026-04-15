import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 로그인 사용자 → /my (채팅은 /my에 내장)
  // 비로그인 → 기존 체험 유지 (킬러 데모)
  if (user) redirect('/my');

  // Guest: dynamic import to keep bundle clean
  const { ChatInterface } = await import('@/components/chat/ChatInterface');
  return <ChatInterface onboarding={false} graphNodes={[]} />;
}
