import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slide_number, agent_id, call_identifier } = body;

    if (!slide_number || !agent_id || !call_identifier) {
      return NextResponse.json(
        { error: "Missing or invalid slide_number, agent_id, or call_identifier" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      console.error("Failed to initialize Supabase client");
      return NextResponse.json(
        { error: "Failed to initialize Supabase client" },
        { status: 500 }
      );
    }

    const channelName = `agent-events:${call_identifier}`;
    const channel = supabase.channel(channelName);
    const sendStatus = await channel.send({
      type: 'broadcast',
      event: 'slide_changed',
      payload: { slide_number, agent_id },
    });

    if (sendStatus !== 'ok') {
      console.error("Supabase broadcast failed with status:", sendStatus);
      await supabase.removeChannel(channel);
      return NextResponse.json(
        { error: `Failed to broadcast event, status: ${sendStatus}` },
        { status: 500 }
      );
    }
    
    await supabase.removeChannel(channel);

    return NextResponse.json(
      { message: "Webhook processed successfully", data: { slide_number, agent_id, call_identifier } },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}