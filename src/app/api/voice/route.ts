import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;

    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'audio file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Whisper API 호출
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcript = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'ko',
    });

    return new Response(
      JSON.stringify({ text: transcript.text }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[Voice] STT failed:', e);
    return new Response(
      JSON.stringify({ error: 'STT 변환에 실패했어요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
