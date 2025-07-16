import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, organization_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user: adminUser } } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!adminUser) {
        throw new Error("User not authenticated");
    }

    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('organization_id', organization_id)
      .single();

    if (orgUserError || orgUser?.role !== 'admin') {
      throw new Error("You do not have permission to delete users from this organization.");
    }

    const { error: deleteOrgUserError } = await supabaseAdmin
        .from('organization_users')
        .delete()
        .eq('user_id', user_id)
        .eq('organization_id', organization_id);

    if (deleteOrgUserError) {
        throw new Error(`Failed to delete user from organization: ${deleteOrgUserError.message}`);
    }

    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthUserError) {
        throw new Error(`Failed to delete user account: ${deleteAuthUserError.message}`);
    }

    return new Response(JSON.stringify({ message: "User deleted successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});