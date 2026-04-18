import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OUFile } from '@/lib/ou-format/types';

const SUPPORTED_VERSIONS = ['1.0'];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let ouFile: OUFile;
    try {
      ouFile = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // ---- Validate .ou file structure ----
    if (!ouFile.version) {
      return NextResponse.json({ error: '.ou 파일에 version 필드가 없습니다' }, { status: 400 });
    }

    if (!SUPPORTED_VERSIONS.includes(ouFile.version)) {
      return NextResponse.json({
        error: `지원하지 않는 .ou 파일 버전입니다: ${ouFile.version}. 지원 버전: ${SUPPORTED_VERSIONS.join(', ')}`,
        supportedVersions: SUPPORTED_VERSIONS,
      }, { status: 400 });
    }

    if (!ouFile.metadata) {
      return NextResponse.json({ error: '.ou 파일에 metadata가 없습니다' }, { status: 400 });
    }

    if (!Array.isArray(ouFile.nodes)) {
      return NextResponse.json({ error: '.ou 파일에 nodes 배열이 없습니다' }, { status: 400 });
    }

    // Validate each node has required fields
    for (let i = 0; i < ouFile.nodes.length; i++) {
      const node = ouFile.nodes[i];
      if (!node.domain || typeof node.raw !== 'string') {
        return NextResponse.json({
          error: `nodes[${i}]에 domain 또는 raw 필드가 누락되었습니다`,
        }, { status: 400 });
      }
    }

    // ---- Deduplication: check existing nodes by raw + created_at ----
    const existingRawSet = new Set<string>();

    if (ouFile.nodes.length > 0) {
      // Fetch existing nodes' raw text to check for duplicates
      const { data: existingNodes } = await supabase
        .from('data_nodes')
        .select('raw, created_at')
        .eq('user_id', user.id);

      if (existingNodes) {
        for (const en of existingNodes as Array<{ raw: string; created_at: string }>) {
          // Create a dedup key from raw text + created_at (if available)
          existingRawSet.add(`${en.raw}||${en.created_at}`);
        }
      }
    }

    const imported = { nodes: 0, views: 0, edges: 0, skipped: 0 };
    const nodeIdMap: Record<string, string> = {}; // old id -> new id

    // ---- Import nodes ----
    for (const node of ouFile.nodes) {
      // Check for duplicates using raw + created_at from the .ou file
      const dedupKey = `${node.raw}||${(node as { created_at?: string }).created_at ?? ''}`;
      if (existingRawSet.has(dedupKey)) {
        imported.skipped++;
        continue;
      }

      const { data: inserted, error } = await supabase
        .from('data_nodes')
        .insert({
          user_id: user.id,
          domain: node.domain,
          raw: node.raw,
          domain_data: node.domain_data ?? null,
          source_type: 'import',
          confidence: 'medium',
          resolution: 'resolved',
          visibility: 'private',
        })
        .select('id')
        .single();

      if (!error && inserted) {
        nodeIdMap[node.id] = inserted.id;
        imported.nodes++;
      }
    }

    // ---- Import edges/relations ----
    if (Array.isArray(ouFile.edges)) {
      for (const edge of ouFile.edges) {
        const sourceId = nodeIdMap[edge.source];
        const targetId = nodeIdMap[edge.target];
        // Only import edges where both source and target were imported
        if (sourceId && targetId) {
          const { error } = await supabase.from('node_relations').insert({
            source_node_id: sourceId,
            target_node_id: targetId,
            predicate: edge.type,
            weight: edge.weight ?? null,
          });
          if (!error) imported.edges++;
        }
      }
    }

    // ---- Import views ----
    if (Array.isArray(ouFile.views)) {
      for (const view of ouFile.views) {
        const { error } = await supabase.from('saved_views').insert({
          user_id: user.id,
          name: view.name,
          view_type: view.viewType,
          filter_config: view.filterConfig ?? null,
          custom_code: view.customCode ?? null,
        });
        if (!error) imported.views++;
      }
    }

    // ---- Import triples ----
    let triplesImported = 0;
    for (const node of ouFile.nodes) {
      const newNodeId = nodeIdMap[node.id];
      if (newNodeId && node.triples && node.triples.length > 0) {
        for (const triple of node.triples) {
          const { error } = await supabase.from('triples').insert({
            node_id: newNodeId,
            subject: triple.subject,
            predicate: triple.predicate,
            object: triple.object,
          });
          if (!error) triplesImported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: {
        ...imported,
        triples: triplesImported,
      },
    });
  } catch (e) {
    console.error('[Import] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
