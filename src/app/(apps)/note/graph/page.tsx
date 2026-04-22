import dynamic from 'next/dynamic';
import { NoteLayout } from '@/components/views/note/NoteLayout';

const NoteGraphView = dynamic(
  () => import('@/components/views/note/NoteGraphView').then(m => m.NoteGraphView),
  { ssr: false },
);

export default function NoteGraphPage() {
  return (
    <NoteLayout>
      <div style={{ width: '100%', height: '100dvh' }}>
        <NoteGraphView />
      </div>
    </NoteLayout>
  );
}
