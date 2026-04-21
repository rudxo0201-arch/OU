import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';

const NoteView = dynamic(
  () => import('@/components/views/NoteView').then((m) => m.NoteView),
  { ssr: false }
);

const NoteLayout = dynamic(
  () => import('@/components/views/note/NoteLayout').then((m) => m.NoteLayout),
  { ssr: false }
);

interface Props {
  params: { noteId: string };
}

export default async function NotePage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // noteId === 'new' → 새 노트 생성 후 redirect
  if (params.noteId === 'new') {
    const { data, error } = await supabase
      .from('data_nodes')
      .insert({
        user_id: user.id,
        domain: 'note',
        raw: '',
        domain_data: {
          title: '',
          parent_page_id: null,
          blocks: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        confidence: 'high',
        visibility: 'private',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[Note/new]', error?.message);
      return (
        <div style={{ padding: 32, color: 'var(--ou-text-muted)' }}>노트 생성 실패</div>
      );
    }

    redirect(`/note/${data.id}`);
  }

  // 기존 노트 조회
  const { data: node, error } = await supabase
    .from('data_nodes')
    .select('id, domain, domain_data, raw, created_at, updated_at')
    .eq('id', params.noteId)
    .eq('user_id', user.id)
    .eq('domain', 'note')
    .single();

  if (error || !node) {
    notFound();
  }

  const title = (node.domain_data as Record<string, unknown>)?.title as string | undefined;

  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: 'var(--ou-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    }>
      <NoteLayout noteId={params.noteId} title={title || '제목 없음'}>
        <NoteView nodes={[node]} />
      </NoteLayout>
    </Suspense>
  );
}
