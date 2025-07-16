import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { agentId, question_list } = await req.json();

  const { data, error } = await supabase.functions.invoke('get-targeted-prompt', {
    body: { agentId, question_list },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}