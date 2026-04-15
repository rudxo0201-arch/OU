import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadTextToR2, buildProjectR2Prefix } from '@/lib/storage/r2';
import { getTemplate } from '@/lib/dev/templates';

/**
 * GET /api/dev/projects
 * 사용자의 프로젝트 목록 조회
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from('data_nodes')
    .select('id, domain_data, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('domain', 'development')
    .eq('source_type', 'dev_project')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (projects ?? []).map(p => ({
    id: p.id,
    name: p.domain_data?.project_name ?? 'Untitled',
    description: p.domain_data?.description ?? '',
    techStack: p.domain_data?.tech_stack ?? [],
    template: p.domain_data?.template ?? 'blank',
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  return NextResponse.json({ projects: list });
}

/**
 * POST /api/dev/projects
 * 새 프로젝트 생성
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    name: string;
    description?: string;
    template?: string;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 });
  }

  const template = getTemplate(body.template || 'blank');
  const techStack = template?.techStack ?? [];

  // 1. DataNode 생성
  const { data: node, error } = await supabase
    .from('data_nodes')
    .insert({
      user_id: user.id,
      domain: 'development',
      source_type: 'dev_project',
      raw: `프로젝트: ${name}\n${body.description || ''}`,
      confidence: 'high',
      resolution: 'resolved',
      view_hint: 'dev_workspace',
      visibility: 'private',
      domain_data: {
        project_name: name,
        description: body.description || '',
        tech_stack: techStack,
        template: body.template || 'blank',
        status: 'active',
      },
    })
    .select('id')
    .single();

  if (error || !node) {
    return NextResponse.json({ error: error?.message || 'Failed to create project' }, { status: 500 });
  }

  // 2. 템플릿 파일을 R2에 업로드
  if (template && template.files.length > 0) {
    const prefix = buildProjectR2Prefix(user.id, node.id);
    const uploads = template.files.map(f =>
      uploadTextToR2(prefix + f.path, f.content).catch(e => {
        console.error(`[Project] template upload failed: ${f.path}`, e);
      })
    );
    await Promise.all(uploads);
  }

  return NextResponse.json({
    projectId: node.id,
    name,
    template: body.template || 'blank',
  });
}
