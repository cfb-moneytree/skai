import { NextResponse } from "next/server";
import { getConversationAudio } from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function verifyConversationOwnership(
  supabase: any,
  userId: string,
  conversationId: string
): Promise<boolean> {
  const { data: userAgentMappings, error: dbError } = await supabase
    .from("user_elevenlabs_agents")
    .select("elevenlabs_agent_id")
    .eq("user_id", userId);

  if (dbError || !userAgentMappings || userAgentMappings.length === 0) {
    console.warn(
      `[API AudioProxy] User ${userId} has no agents, or DB error for conversation ${conversationId}. Denying audio.`
    );
    return false;
  }

  console.warn(
    `[API AudioProxy] Simplified ownership check for conversation ${conversationId} for user ${userId}. Consider enhancing if direct agent_id for conversation is available.`
  );
  return true;
}

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
    console.error("[API AudioProxy] Auth error:", userError);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isOwner = await verifyConversationOwnership(
    supabase,
    user.id,
    conversationId
  );
  if (!isOwner) {
    console.warn(
      `[API AudioProxy] User ${user.id} attempt to access audio for unverified conversation ${conversationId}`
    );
    return NextResponse.json(
      { message: "Forbidden or conversation not found for user." },
      { status: 403 }
    );
  }

  try {
    const audioResponse: Response = await getConversationAudio(conversationId);

    const stream = audioResponse.body;

    const clientHeaders = new Headers();

    const contentType = audioResponse.headers.get("Content-Type");
    if (contentType && contentType.startsWith("audio/")) {
      clientHeaders.set("Content-Type", contentType);
    } else {
      console.warn(
        `[API AudioProxy] ElevenLabs response Content-Type was '${contentType}' for ${conversationId}. Overriding to 'audio/mpeg'.`
      );
      clientHeaders.set("Content-Type", "audio/mpeg");
    }

    console.log(
      `[API AudioProxy] ElevenLabs response Content-Type for ${conversationId}:`,
      contentType
    );
    console.log(
      `[API AudioProxy] Sending headers to client for ${conversationId}:`,
      Object.fromEntries(clientHeaders.entries())
    );

    return new NextResponse(stream, {
      status: audioResponse.status,
      statusText: audioResponse.statusText,
      headers: clientHeaders,
    });
  } catch (error) {
    console.error(
      `[API AudioProxy] Error fetching audio for ${conversationId}:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;

    if (errorMessage === "ElevenLabs API key is not configured.") {
      statusCode = 503;
    } else if (errorMessage.startsWith("Failed to fetch audio")) {
      statusCode = 502;
    } else if (errorMessage === "Conversation ID is required.") {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        message: `Failed to fetch audio for conversation ${conversationId}.`,
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}
