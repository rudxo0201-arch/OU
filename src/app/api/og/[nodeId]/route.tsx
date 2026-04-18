import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: { nodeId: string } }) {
  try {
    const supabase = await createClient();
    const { data: node } = await supabase
      .from('data_nodes')
      .select('raw, domain')
      .eq('id', params.nodeId)
      .single();

    return new ImageResponse(
      (
        <div style={{
          background: '#060810',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          fontFamily: 'sans-serif',
        }}>
          <div style={{ fontSize: 20, opacity: 0.5, marginBottom: 20 }}>
            OU · {node?.domain}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.4 }}>
            {(node?.raw ?? '').slice(0, 100)}
          </div>
          <div style={{ marginTop: 'auto', fontSize: 16, opacity: 0.4 }}>
            ouuniverse.com
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    console.error('[OG] Image generation failed:', e);
    return new Response('OG image generation failed', { status: 500 });
  }
}
