import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ScenarioDetailClient } from './ScenarioDetailClient';

interface PageProps {
  params: { nodeId: string };
}

export default async function ScenarioDetailPage({ params }: PageProps) {
  const { nodeId } = params;
  const supabase = await createClient();

  // Fetch the scenario node
  const { data: scenarioNode, error } = await supabase
    .from('data_nodes')
    .select('id, title, raw, created_at, user_id, domain_data, profiles(display_name, handle)')
    .eq('id', nodeId)
    .eq('visibility', 'public')
    .single();

  if (error || !scenarioNode) {
    notFound();
  }

  const normalized = {
    ...scenarioNode,
    profiles: Array.isArray(scenarioNode.profiles)
      ? scenarioNode.profiles[0] ?? null
      : scenarioNode.profiles,
  };

  // Fetch realizations for this scenario
  const { data: relations } = await supabase
    .from('node_relations')
    .select('source_node_id')
    .eq('target_node_id', nodeId)
    .eq('relation_type', 'realized');

  const realizationNodeIds = (relations ?? []).map((r: any) => r.source_node_id);

  let realizations: any[] = [];
  if (realizationNodeIds.length > 0) {
    const { data: rNodes } = await supabase
      .from('data_nodes')
      .select('id, title, raw, created_at, user_id, domain_data, profiles(id, display_name, avatar_url, handle)')
      .in('id', realizationNodeIds)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    realizations = (rNodes ?? []).map((n: any) => ({
      ...n,
      profiles: Array.isArray(n.profiles) ? n.profiles[0] ?? null : n.profiles,
    }));
  }

  return (
    <ScenarioDetailClient
      scenario={normalized}
      initialRealizations={realizations}
    />
  );
}
