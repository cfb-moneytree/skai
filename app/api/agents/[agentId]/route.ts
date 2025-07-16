import { NextResponse } from "next/server";
import {
  getElevenLabsAgentDetails,
  ElevenLabsAgentDetails,
  AgentDataFromUI,
  updateElevenLabsAgent,
  deleteElevenLabsAgent
} from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { agentId: elevenlabsAgentId } = await params;

  if (!elevenlabsAgentId) {
    return NextResponse.json(
      { message: "Agent ID is required in path." },
      { status: 400 }
    );
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        `[API GET /agents/elevenlabs/${elevenlabsAgentId}] Unauthorized or error fetching user:`,
        userError
      );
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: agentData, error: dbError } = await supabase
      .from("user_elevenlabs_agents")
      .select("*")
      .eq("elevenlabs_agent_id", elevenlabsAgentId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !agentData) {
      return NextResponse.json(
        { message: "Agent not found in database." },
        { status: 404 }
      );
    }

    const responseData: AgentDataFromUI = {
      name: agentData.agent_name || "",
      language: agentData.language || "en",
      voice_id: agentData.voice_id || "",
      instructions: agentData.instructions || "",
      firstMessage: agentData.first_message || "",
      evaluation_criteria: agentData.evaluation_criteria || [],
      knowledge_base_text_entry: undefined,
      cover_image: agentData.cover_image || undefined,
      passing_score: agentData.passing_score || 0,
      category_id: agentData.category_id || "",
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error(
      `[API GET /agents/elevenlabs/${elevenlabsAgentId}] Error fetching agent details:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;
    if (errorMessage === "API key is not configured.") {
      statusCode = 503;
    } else if (errorMessage.startsWith("Failed to fetch agent details")) {
      statusCode = 502;
    }
    return NextResponse.json(
      { message: "Failed to fetch agent details", details: errorMessage },
      { status: statusCode }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { agentId: elevenlabsAgentId } = await params;

  if (!elevenlabsAgentId) {
    return NextResponse.json(
      { message: "Agent ID is required in path." },
      { status: 400 }
    );
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: agentMapping, error: mappingError } = await supabase
      .from("user_elevenlabs_agents")
      .select("id, agent_name, cover_image")
      .eq("user_id", user.id)
      .eq("elevenlabs_agent_id", elevenlabsAgentId)
      .single();

    if (mappingError || !agentMapping) {
      console.error(
        `[API PATCH /agents/elevenlabs/${elevenlabsAgentId}] User ${user.id} does not own this agent or mapping error:`,
        mappingError
      );
      return NextResponse.json(
        {
          message:
            "Agent not found or you are not authorized to update this agent.",
        },
        {
          status:
            mappingError && mappingError.code === "PGRST116"
              ? 404
              : mappingError
              ? 500
              : 403,
        }
      );
    }

    const formData = await request.formData();
    const agentUpdateData: Partial<AgentDataFromUI> = {
      name: formData.get('name') as string,
      language: formData.get('language') as string,
      voice_id: formData.get('voice_id') as string,
      instructions: formData.get('instructions') as string,
      firstMessage: formData.get('firstMessage') as string,
      evaluation_criteria: JSON.parse(formData.get('evaluation_criteria') as string || '{}'),
      passing_score: parseFloat(formData.get('passing_score') as string),
      category_id: formData.get('category_id') as string,
    };
    const coverImageFile = formData.get('cover_image') as File | null;

    if (agentUpdateData.passing_score && (agentUpdateData.passing_score < 0 || agentUpdateData.passing_score > 100)) {
      return NextResponse.json(
        { message: "Passing score must be between 0 and 100." },
        { status: 400 }
      );
    }

    await updateElevenLabsAgent(elevenlabsAgentId, agentUpdateData);

    let coverImagePath: string | undefined = undefined;
    if (coverImageFile) {
      if (agentMapping.cover_image) {
        await supabase.storage.from('lessons').remove([agentMapping.cover_image]);
      }

      const filePath = `slide_covers/${elevenlabsAgentId}-${coverImageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('lessons')
        .upload(filePath, coverImageFile);

      if (uploadError) {
        console.error(`[API PATCH /agents/elevenlabs/${elevenlabsAgentId}] Supabase storage error:`, uploadError);
        return NextResponse.json(
          { message: "Failed to upload new cover image.", details: uploadError.message },
          { status: 500 }
        );
      }
      coverImagePath = filePath;
    }

    const updatePayload: any = {
      agent_name: agentUpdateData.name,
      language: agentUpdateData.language,
      voice_id: agentUpdateData.voice_id,
      instructions: agentUpdateData.instructions,
      first_message: agentUpdateData.firstMessage,
      evaluation_criteria: agentUpdateData.evaluation_criteria,
      passing_score: agentUpdateData.passing_score,
      category_id: agentUpdateData.category_id,
      updated_at: new Date().toISOString(),
    };

    if (coverImagePath !== undefined) {
      updatePayload.cover_image = coverImagePath;
    }

    const { error: dbUpdateError } = await supabase
      .from("user_elevenlabs_agents")
      .update(updatePayload)
      .eq("elevenlabs_agent_id", elevenlabsAgentId)
      .eq("user_id", user.id);

    if (dbUpdateError) {
      console.error(
        `[API PATCH /agents/elevenlabs/${elevenlabsAgentId}] Failed to update agent in Supabase:`,
        dbUpdateError
      );
      return NextResponse.json(
        {
          message:
            "Agent updated, but failed to update in application database.",
          details: dbUpdateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Agent updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[API PATCH /agents/elevenlabs/${elevenlabsAgentId}] Error updating agent:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;
    if (errorMessage === "API key is not configured.") {
      statusCode = 503;
    } else if (errorMessage.startsWith("Failed to update agent")) {
      statusCode = 502;
    } else if (errorMessage === "Agent ID is required for update.") {
      statusCode = 400;
    }
    return NextResponse.json(
      { message: "Failed to update agent", details: errorMessage },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { agentId: elevenlabsAgentId } = await params;

  if (!elevenlabsAgentId) {
    return NextResponse.json(
      { message: "Agent ID is required in path." },
      { status: 400 }
    );
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: agentMapping, error: mappingError } = await supabase
      .from("user_elevenlabs_agents")
      .select("id")
      .eq("user_id", user.id)
      .eq("elevenlabs_agent_id", elevenlabsAgentId)
      .single();

    if (mappingError || !agentMapping) {
      console.error(
        `[API DELETE /agents/${elevenlabsAgentId}] User ${user.id} does not own this agent or mapping error:`,
        mappingError
      );
      return NextResponse.json(
        {
          message: "Agent not found for this user or not authorized to delete.",
        },
        {
          status:
            mappingError && mappingError.code === "PGRST116"
              ? 404
              : mappingError
              ? 500
              : 403,
        }
      );
    }

    await deleteElevenLabsAgent(elevenlabsAgentId);

    const { error: dbDeleteError } = await supabase
      .from("user_elevenlabs_agents")
      .delete()
      .eq("elevenlabs_agent_id", elevenlabsAgentId)
      .eq("user_id", user.id);

    if (dbDeleteError) {
      console.error(
        `[API DELETE /agents/${elevenlabsAgentId}] Supabase error deleting mapping:`,
        dbDeleteError
      );
      return NextResponse.json(
        {
          message:
            "Agent deleted, but failed to delete mapping from application database.",
          details: dbDeleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Agent deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[API DELETE /agents/${elevenlabsAgentId}] Error deleting agent:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;
    if (errorMessage === "API key is not configured.") {
      statusCode = 503;
    } else if (errorMessage.startsWith("Failed to delete agent")) {
      statusCode = 502;
    } else if (errorMessage === "Agent ID is required for deletion.") {
      statusCode = 400;
    }
    return NextResponse.json(
      { message: "Failed to delete agent", details: errorMessage },
      { status: statusCode }
    );
  }
}
