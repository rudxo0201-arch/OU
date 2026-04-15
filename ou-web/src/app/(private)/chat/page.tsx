import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ChatInterface } from '@/components/chat/ChatInterface';

async function ChatPageInner({ searchParams }: { searchParams: { onboarding?: string } }) {
  const onboarding = searchParams.onboarding === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let graphNodes: any[] = [];
  if (user) {
    const { data } = await supabase
      .from('data_nodes')
      .select('id, domain, raw, importance')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    graphNodes = data ?? [];
  }

  return <ChatInterface onboarding={onboarding} graphNodes={graphNodes} />;
}

export default function ChatPage({ searchParams }: { searchParams: { onboarding?: string } }) {
  return (
    <Suspense fallback={null}>
      <ChatPageInner searchParams={searchParams} />
    </Suspense>
  );
}
