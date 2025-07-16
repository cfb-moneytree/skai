import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const json = await request.json();

  if (!json || !json.data || !json.data.analysis || !json.data.analysis.evaluation_criteria_results) {
    return new NextResponse('Missing required fields', { status: 400 });
  }

  const { agent_id, conversation_id } = json.data;
  const { evaluation_criteria_results } = json.data.analysis;

  const records = Object.entries(evaluation_criteria_results).map(([criteria_id, result]: [string, any]) => ({
    elevenlabs_agent_id: agent_id,
    conversation_id,
    criteria_id,
    result: result.result,
    rationale: result.rationale,
  }));

  const { error } = await supabase.from('evaluation_criteria_results').insert(records);

  if (error) {
    console.error('Error inserting evaluation criteria results:', error);
    return new NextResponse('Error inserting data', { status: 500 });
  }

  return new NextResponse('Data inserted successfully', { status: 200 });
}