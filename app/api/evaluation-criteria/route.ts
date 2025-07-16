import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return new NextResponse('Missing agentId', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('evaluation_criteria_results')
    .select('criteria_id')
    .eq('elevenlabs_agent_id', agentId);

  if (error) {
    console.error('Error fetching evaluation criteria:', error);
    return new NextResponse('Error fetching data', { status: 500 });
  }

  const distinctCriteria = [...new Set(data.map(item => item.criteria_id))];

  return NextResponse.json(distinctCriteria);
}