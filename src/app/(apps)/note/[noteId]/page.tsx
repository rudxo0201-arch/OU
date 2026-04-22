import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';

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
        source_type: 'manual',
        raw: '',
        domain_data: {
          title: '',
          parent_page_id: null,
          blocks: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[Note/new]', error?.message);
      return (
        <div style={{ padding: 32, color: 'var(--ou-text-muted)', fontFamily: 'monospace', fontSize: 13 }}>
          노트 생성 실패: {error?.message ?? 'unknown error'}
        </div>
      );
    }
    redirect(`/note/${data.id}`);
  }

  // 존재 여부만 확인 (실제 데이터는 NotePanel이 클라이언트에서 fetch)
  const { data: exists } = await supabase
    .from('data_nodes')
    .select('id')
    .eq('id', params.noteId)
    .eq('user_id', user.id)
    .eq('domain', 'note')
    .single();

  if (!exists) notFound();

  // NoteLayout → PanelWorkspace → NotePanel 이 클라이언트에서 데이터를 로드
  return <NoteLayout noteId={params.noteId} />;
}
