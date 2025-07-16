import { NextResponse } from 'next/server';
import { getElevenLabsConversations, ConversationsResponse } from '@/lib/elevenlabs/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const cursor = searchParams.get('cursor') || undefined;
  const pageSizeParam = searchParams.get('page_size');
  const agentId = searchParams.get('agentId') || undefined;
  const callStartBeforeUnixParam = searchParams.get('callStartBeforeUnix');
  const callStartAfterUnixParam = searchParams.get('callStartAfterUnix');
  const criteriaIds = searchParams.getAll('criteriaId');

  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : undefined;
  const callStartBeforeUnix = callStartBeforeUnixParam ? parseInt(callStartBeforeUnixParam, 10) : undefined;
  const callStartAfterUnix = callStartAfterUnixParam ? parseInt(callStartAfterUnixParam, 10) : undefined;

  if (pageSizeParam && (isNaN(pageSize!) || pageSize! <= 0)) {
    return NextResponse.json({ message: 'Invalid page_size parameter.' }, { status: 400 });
  }
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
      console.error("[API /api/call-history] Auth error:", userError);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: userAgentMappings, error: dbError } = await supabase
      .from("user_elevenlabs_agents")
      .select("elevenlabs_agent_id")
      .eq("user_id", user.id);

    if (dbError) {
      console.error("[API /api/call-history] Supabase error fetching user agents:", dbError);
      return NextResponse.json({ message: "Failed to fetch user agent mappings." }, { status: 500 });
    }

    const userOwnedAgentIds = userAgentMappings?.map(mapping => mapping.elevenlabs_agent_id) || [];

    if (userOwnedAgentIds.length === 0 && !agentId) {
      return NextResponse.json({ conversations: [], has_more: false, next_cursor: null }, { status: 200 });
    }

    let agentIdForElevenLabsCall = agentId;

    if (agentId) {
      if (!userOwnedAgentIds.includes(agentId)) {
        console.warn(`[API /api/call-history] User ${user.id} attempted to filter by unowned agent ${agentId}`);
        return NextResponse.json({ conversations: [], has_more: false, next_cursor: null }, { status: 200 });
      }
    } else {
      agentIdForElevenLabsCall = undefined;
    }

    const paramsForElevenLabs: Parameters<typeof getElevenLabsConversations>[0] = {
      cursor,
      pageSize,
      agentId: agentIdForElevenLabsCall,
      callStartBeforeUnix,
      callStartAfterUnix,
    };

    let conversationsResponse: ConversationsResponse;

    if (criteriaIds.length > 0 && agentId) {
      const { data: evaluationData, error: evaluationError } = await supabase
        .from('evaluation_criteria_results')
        .select('conversation_id')
        .eq('elevenlabs_agent_id', agentId)
        .in('criteria_id', criteriaIds);

      if (evaluationError) {
        console.error("[API /api/call-history] Supabase error fetching evaluation results:", evaluationError);
        return NextResponse.json({ message: "Failed to fetch evaluation data." }, { status: 500 });
      }

      const conversationIds = evaluationData.map(item => item.conversation_id);
      
      if (conversationIds.length === 0) {
        return NextResponse.json({ conversations: [], has_more: false, next_cursor: null }, { status: 200 });
      }
      
      const allConversationsForAgent = await getAllConversationsForAgent(agentId);
      const filteredConversations = allConversationsForAgent.filter(convo => conversationIds.includes(convo.conversation_id));
      
      conversationsResponse = {
        conversations: filteredConversations,
        has_more: false,
        next_cursor: null
      };

    } else {
      conversationsResponse = await getElevenLabsConversations(paramsForElevenLabs);
    }
    
    async function getAllConversationsForAgent(agentId: string): Promise<any[]> {
      let allConversations: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;
    
      while (hasMore) {
        const params: Parameters<typeof getElevenLabsConversations>[0] = {
          agentId,
          pageSize: 100,
          cursor: cursor || undefined,
        };
        const response: ConversationsResponse = await getElevenLabsConversations(params);
        allConversations = allConversations.concat(response.conversations);
        cursor = response.next_cursor;
        hasMore = response.has_more;
      }
    
      return allConversations;
    }

    if (!agentId && userOwnedAgentIds.length > 0) {
      conversationsResponse.conversations = conversationsResponse.conversations.filter(
        convo => userOwnedAgentIds.includes(convo.agent_id)
      );
    }

    return NextResponse.json(conversationsResponse, { status: 200 });

  } catch (error) {
    console.error("[API /api/call-history] Error fetching conversations:", error);
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
      { message: "Failed to fetch call history.", details: errorMessage },
      { status: statusCode }
    );
  }
}