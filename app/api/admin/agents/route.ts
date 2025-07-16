import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getElevenLabsAgentDetails, ElevenLabsAgentDetails } from '@/lib/elevenlabs/api';
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js';

interface UserElevenLabsAgentDBRow {
  id: string;
  user_id: string;
  elevenlabs_agent_id: string;
  agent_name?: string | null;
  created_at: string;
}

interface UserCacheData {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string; [key: string]: any };
}

export interface AdminAppAgentDetails extends ElevenLabsAgentDetails {
  app_mapping_id: string;
  app_created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsAdmin = user?.user_metadata?.role === 'admin';
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Not authorized. Admin role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '10', 10);
    const offset = (page - 1) * perPage;

    const { data: agentMappings, error: dbError, count } = await supabase
      .from('user_elevenlabs_agents')
      .select(`
        id, user_id, elevenlabs_agent_id, created_at, agent_name
      `, { count: 'exact' })
      .range(offset, offset + perPage - 1)
      .order('created_at', { ascending: false });


    if (dbError) {
      console.error("[API /admin/agents] Supabase error fetching mappings:", dbError);
      return NextResponse.json({ error: "Failed to fetch agent mappings.", details: dbError.message }, { status: 500 });
    }

    if (!agentMappings || agentMappings.length === 0) {
      return NextResponse.json({ users: [], total: 0, page, perPage, totalPages: 0 }, { status: 200 });
    }
    
    const typedAgentMappings = agentMappings as UserElevenLabsAgentDBRow[];

    const userIds = [...new Set(typedAgentMappings.map(m => m.user_id))];
    let usersMap: Map<string, UserCacheData> = new Map();

    if (userIds.length > 0) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!serviceRoleKey || !supabaseUrl) {
        console.error('[API /admin/agents] Missing Supabase service role key or URL environment variables for fetching user details.');
      } else {
        const supabaseAdminClient = createAdminSupabaseClient(supabaseUrl, serviceRoleKey);
        for (const userId of userIds) {
          const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.getUserById(userId);
          if (userError) {
            console.error(`[API /admin/agents] Error fetching user ${userId}:`, userError.message);
          } else if (userData && userData.user) {
            usersMap.set(userData.user.id, {
              id: userData.user.id,
              email: userData.user.email,
              user_metadata: userData.user.user_metadata
            } as UserCacheData);
          }
        }
        console.log("[API /admin/agents] Populated usersMap from auth.users:", usersMap.size, "users found.");
      }
    }

    const agentDetailsPromises = typedAgentMappings.map(async (mapping) => {
      const details = await getElevenLabsAgentDetails(mapping.elevenlabs_agent_id);
      const displayName = details?.name || mapping.agent_name || "Unnamed Agent";
      
      const userProfile = usersMap.get(mapping.user_id);

      let userName = userProfile?.user_metadata?.name || userProfile?.user_metadata?.full_name;
      if (!userName) {
          userName = userProfile?.email;
      }

      const agentData: AdminAppAgentDetails = {
        ...(details || { agent_id: mapping.elevenlabs_agent_id, conversation_config: { tts: {}, agent: { prompt: {} } } }),
        name: displayName,
        app_mapping_id: mapping.id,
        app_created_at: mapping.created_at,
        user_id: mapping.user_id,
        user_email: userProfile?.email,
        user_name: userName,
      };
      
      if (!details) {
        console.warn(`Agent details not found on ElevenLabs for ID: ${mapping.elevenlabs_agent_id}. Returning DB data only.`);
      }
      return agentData;
    });

    const resolvedAgentDetails = (await Promise.all(agentDetailsPromises)).filter(
      (details): details is AdminAppAgentDetails => details !== null
    );

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    return NextResponse.json({
      agents: resolvedAgentDetails,
      total: totalCount,
      page,
      perPage,
      totalPages,
    }, { status: 200 });

  } catch (error) {
    console.error("[API /admin/agents] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to fetch admin agents list.", details: errorMessage }, { status: 500 });
  }
}