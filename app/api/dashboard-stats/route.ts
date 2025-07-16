import { NextResponse } from 'next/server';
import { getElevenLabsConversations, ConversationsResponse, CallHistoryConversation } from '@/lib/elevenlabs/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const callStartBeforeUnixParam = searchParams.get('callStartBeforeUnix');
  const callStartAfterUnixParam = searchParams.get('callStartAfterUnix');

  const callStartBeforeUnix = callStartBeforeUnixParam ? parseInt(callStartBeforeUnixParam, 10) : undefined;
  const callStartAfterUnix = callStartAfterUnixParam ? parseInt(callStartAfterUnixParam, 10) : undefined;

  if (callStartBeforeUnixParam && isNaN(callStartBeforeUnix!)) {
    return NextResponse.json({ message: 'Invalid callStartBeforeUnix parameter.' }, { status: 400 });
  }
  if (callStartAfterUnixParam && isNaN(callStartAfterUnix!)) {
    return NextResponse.json({ message: 'Invalid callStartAfterUnix parameter.' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[API /api/dashboard-stats] Auth error:", userError);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: userAgentMappings, error: dbError } = await supabase
      .from("user_elevenlabs_agents")
      .select("elevenlabs_agent_id")
      .eq("user_id", user.id);

    if (dbError) {
      console.error("[API /api/dashboard-stats] Supabase error fetching user agents:", dbError);
      return NextResponse.json({ message: "Failed to fetch user agent mappings." }, { status: 500 });
    }

    const userOwnedAgentIds = userAgentMappings?.map(mapping => mapping.elevenlabs_agent_id) || [];

    if (userOwnedAgentIds.length === 0) {
      return NextResponse.json({ total_message_count: 0, total_call_duration_secs: 0 }, { status: 200 });
    }

    let allConversations: CallHistoryConversation[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const paramsForElevenLabs: Parameters<typeof getElevenLabsConversations>[0] = {
        cursor: nextCursor,
        pageSize: 100,
        agentId: undefined,
        callStartBeforeUnix,
        callStartAfterUnix,
      };

      const conversationsResponse: ConversationsResponse = await getElevenLabsConversations(paramsForElevenLabs);
      
      allConversations.push(...conversationsResponse.conversations);
      nextCursor = conversationsResponse.next_cursor;
      hasMore = conversationsResponse.has_more;
    }

    const userConversations = allConversations.filter(
      convo => userOwnedAgentIds.includes(convo.agent_id)
    );

    let totalMessageCount = 0;
    let totalCallDurationSecs = 0;

    for (const convo of userConversations) {
      totalMessageCount += convo.message_count || 0;
      totalCallDurationSecs += convo.call_duration_secs || 0;
    }

    return NextResponse.json({ 
      total_message_count: totalMessageCount, 
      total_call_duration_secs: totalCallDurationSecs 
    }, { status: 200 });

  } catch (error) {
    console.error("[API /api/dashboard-stats] Error fetching dashboard stats:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;

    if (errorMessage === "ElevenLabs API key is not configured.") {
      statusCode = 503;
    } else if (errorMessage.startsWith("Failed to fetch conversations from ElevenLabs")) {
      statusCode = 502;
    } else if (errorMessage === "Unexpected response structure for conversations.") {
      statusCode = 502;
    }
    
    return NextResponse.json(
      { message: "Failed to fetch dashboard statistics.", details: errorMessage },
      { status: statusCode }
    );
  }
}