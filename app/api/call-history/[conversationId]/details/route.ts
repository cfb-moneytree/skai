import { NextResponse } from "next/server";
import {
  getDetailedConversation,
  DetailedConversation,
} from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json(
      { message: "Conversation ID is required." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[API ConversationDetails] Auth error:", userError);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const detailedConversation: DetailedConversation =
      await getDetailedConversation(conversationId);

    const agentIdFromConversation = detailedConversation.agent_id;

    const { data: userAgentMapping, error: dbError } = await supabase
      .from("user_elevenlabs_agents")
      .select("elevenlabs_agent_id")
      .eq("user_id", user.id)
      .eq("elevenlabs_agent_id", agentIdFromConversation)
      .maybeSingle();

    if (dbError) {
      console.error(
        `[API ConversationDetails] Supabase error checking ownership for agent ${agentIdFromConversation} by user ${user.id}:`,
        dbError
      );
      return NextResponse.json(
        { message: "Error verifying conversation ownership." },
        { status: 500 }
      );
    }

    if (!userAgentMapping) {
      console.warn(
        `[API ConversationDetails] User ${user.id} attempt to access details for conversation ${conversationId} (agent ${agentIdFromConversation}) which they do not own.`
      );
      return NextResponse.json(
        { message: "Forbidden or conversation details not found for user." },
        { status: 403 }
      );
    }

    return NextResponse.json(detailedConversation, { status: 200 });
  } catch (error) {
    console.error(
      `[API ConversationDetails] Error fetching details for ${conversationId}:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;

    if (errorMessage === "ElevenLabs API key is not configured.") {
      statusCode = 503;
    } else if (
      errorMessage.startsWith("Failed to fetch detailed conversation")
    ) {
      statusCode = 502;
    } else if (
      errorMessage ===
      "Unexpected response structure for detailed conversation."
    ) {
      statusCode = 502;
    } else if (errorMessage === "Conversation ID is required.") {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        message: `Failed to fetch details for conversation ${conversationId}.`,
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}
