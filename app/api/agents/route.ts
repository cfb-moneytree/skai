import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getElevenLabsAgentDetails, ElevenLabsAgentDetails } from "@/lib/elevenlabs/api";

interface UserElevenLabsAgentRow {
  id: string;
  user_id: string;
  elevenlabs_agent_id: string;
  agent_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppAgentDetails extends ElevenLabsAgentDetails {
  app_mapping_id: string;
  app_created_at: string;
}


export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const { searchParams } = new URL(request.url);
  const searchName = searchParams.get("name");

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[API /agents] Error fetching user or no user found:", userError);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("user_elevenlabs_agents")
      .select("id, elevenlabs_agent_id, created_at, agent_name")
      .eq("user_id", user.id);

    if (searchName) {
      query = query.ilike("agent_name", `%${searchName}%`);
    }

    const { data: agentMappings, error: dbError } = await query;

    if (dbError) {
      console.error("[API /agents] Supabase error fetching mappings:", dbError);
      return NextResponse.json(
        { message: "Failed to fetch agent mappings from database.", details: dbError.message },
        { status: 500 }
      );
    }

    if (!agentMappings || agentMappings.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const agentDetailsPromises = agentMappings.map(async (mapping) => {
      const currentMapping = mapping as Pick<UserElevenLabsAgentRow, 'id' | 'elevenlabs_agent_id' | 'created_at' | 'agent_name'>;
      
      const details = await getElevenLabsAgentDetails(currentMapping.elevenlabs_agent_id);
      
      const displayName = details?.name || currentMapping.agent_name || "Unnamed Agent";

      if (details) {
        return {
          ...details,
          name: displayName,
          app_mapping_id: currentMapping.id,
          app_created_at: currentMapping.created_at
        } as AppAgentDetails;
      } else if (searchName && currentMapping.agent_name?.toLowerCase().includes(searchName.toLowerCase())) {
        return {
          agent_id: currentMapping.elevenlabs_agent_id,
          name: displayName,
          app_mapping_id: currentMapping.id,
          app_created_at: currentMapping.created_at,
          conversation_config: { tts: {}, agent: { prompt: {} } }
        } as AppAgentDetails;
      }
      
      console.warn(`Agent details not found on ElevenLabs for ID: ${currentMapping.elevenlabs_agent_id} (app mapping ID: ${currentMapping.id})`);
      return null;
    });

    const resolvedAgentDetails = (await Promise.all(agentDetailsPromises)).filter(
      (details): details is AppAgentDetails => details !== null
    );

    return NextResponse.json(resolvedAgentDetails, { status: 200 });

  } catch (error) {
    console.error("[API /agents] Error fetching agents:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;
    if (errorMessage === "ElevenLabs API key is not configured.") {
        statusCode = 503; 
    } else if (errorMessage.startsWith("Failed to fetch agent details")) {
        statusCode = 502; 
    }
    return NextResponse.json(
      { message: "Failed to fetch agents list", details: errorMessage },
      { status: statusCode }
    );
  }
}