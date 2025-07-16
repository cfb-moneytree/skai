import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('API Key Update: Authentication error', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { service_name, secret_value } = await request.json();

    if (!service_name || typeof service_name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid service_name' }, { status: 400 });
    }
    if (secret_value === undefined || secret_value === null || typeof secret_value !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid secret_value' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('api_credentials')
      .upsert({
        service: service_name,
        secret: secret_value,
        description: `API key for ${service_name} updated by ${user.user_metadata?.full_name || user.id}`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'service'
      })
      .select()
      .single();

    if (error) {
      console.error(`API Key Update: Supabase error upserting ${service_name}:`, error);
      if (error.message.includes('security policy') || error.message.includes('permission denied')) {
        return NextResponse.json({ error: 'Not authorized or RLS policy violation for upsert.' }, { status: 403 });
      }
      return NextResponse.json({ error: `Failed to upsert API key for ${service_name}: ${error.message}` }, { status: 500 });
    }

    if (!data) {
        console.error(`API Key Upsert: Upsert for '${service_name}' reported success, but no data was returned.`);
        return NextResponse.json({ error: `API key operation for '${service_name}' completed, but failed to retrieve result.` }, { status: 500 });
    }

    console.log(`API Key for service '${service_name}' upserted successfully by user ${user.id}.`);
    return NextResponse.json({ message: `API key for ${service_name} upserted successfully.`, data }, { status: 200 });

  } catch (e: any) {
    console.error('API Key Update: Unexpected error:', e);
    return NextResponse.json({ error: 'An unexpected error occurred: ' + e.message }, { status: 500 });
  }
}