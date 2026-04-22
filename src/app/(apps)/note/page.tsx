'use client';

import dynamic from 'next/dynamic';

const NoteLayout = dynamic(
  () => import('@/components/views/note/NoteLayout').then((m) => m.NoteLayout),
  { ssr: false }
);
const NoteIndexContent = dynamic(
  () => import('@/components/views/note/NoteIndexContent').then((m) => m.NoteIndexContent),
  { ssr: false }
);

export default function NoteIndexPage() {
  return (
    <NoteLayout>
      <NoteIndexContent />
    </NoteLayout>
  );
}
