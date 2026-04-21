import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppDef } from '@/lib/apps/registry';
import dynamic from 'next/dynamic';

const AppView = dynamic(
  () => import('@/components/apps/AppView').then(m => m.AppView),
  { ssr: false }
);

interface Props {
  params: { appSlug: string };
  searchParams?: { view?: string };
}

export default async function AppPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const appDef = getAppDef(params.appSlug);
  if (!appDef) notFound();

  // Note는 자체 라우트 사용
  if (appDef.route) redirect(appDef.route);

  // domain 필터로 DataNode 조회
  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('id, domain, domain_data, raw, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('domain', appDef.domain)
    .order('created_at', { ascending: false })
    .limit(200);

  const activeView = searchParams?.view ?? appDef.defaultView;

  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh', background: 'var(--ou-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--ou-text-disabled)',
          animation: 'blink 1s ease-in-out infinite',
        }} />
      </div>
    }>
      <AppView
        appDef={appDef}
        nodes={nodes ?? []}
        activeView={activeView}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: Props) {
  const appDef = getAppDef(params.appSlug);
  return { title: appDef?.label ?? 'OU App' };
}
