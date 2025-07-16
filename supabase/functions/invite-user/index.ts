import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, organization_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user: inviterUser } } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!inviterUser) {
        throw new Error("User not authenticated");
    }

    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .select('role')
      .eq('user_id', inviterUser.id)
      .eq('organization_id', organization_id)
      .single();

    if (orgUserError || orgUser?.role !== 'admin') {
      throw new Error("You do not have permission to invite users.");
    }

    const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: email,
        email_confirm: true,
        user_metadata: { role: 'student' },
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) {
            const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
            if (existingUserError) {
                throw new Error(`Failed to retrieve existing user: ${existingUserError.message}`);
            }
            const { error: linkError } = await supabaseAdmin.from('organization_users').insert({
                organization_id: organization_id,
                user_id: existingUser.user.id,
                role: 'student',
            });
            if (linkError) {
                if (linkError.code === '23505') {
                    return new Response(JSON.stringify({ message: "User is already in this organization." }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    });
                }
                throw new Error(`Failed to link user to organization: ${linkError.message}`);
            }
            const { error: preferencesError } = await supabaseAdmin.from('user_preferences').insert({
                user_id: existingUser.user.id,
                active_organization_id: organization_id,
            });
            if (preferencesError) {
                console.error(`Failed to create user preferences for ${existingUser.user.id}: ${preferencesError.message}`);
            }
            return new Response(JSON.stringify({ message: "User successfully added to the organization." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }
        throw new Error(`Failed to sign up new user: ${signUpError.message}`);
    }

    if (newUser && newUser.user) {
        const { error: linkError } = await supabaseAdmin.from('organization_users').insert({
            organization_id: organization_id,
            user_id: newUser.user.id,
            role: 'student',
        });

        if (linkError) {
            throw new Error(`Failed to link user to organization: ${linkError.message}`);
        }

        const { error: preferencesError } = await supabaseAdmin.from('user_preferences').insert({
            user_id: newUser.user.id,
            active_organization_id: organization_id,
        });

        if (preferencesError) {
            console.error(`Failed to create user preferences for ${newUser.user.id}: ${preferencesError.message}`);
        }
    }

    return new Response(JSON.stringify({ message: "User successfully added to the organization." }), {
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