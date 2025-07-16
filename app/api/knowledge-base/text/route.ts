import { NextResponse } from "next/server";
import { addTextToElevenLabsKnowledgeBase } from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, text } = body;

    if (!name || !text) {
      return NextResponse.json(
        { message: "Name and text are required for the knowledge base entry." },
        { status: 400 }
      );
    }

    const kbResponse = await addTextToElevenLabsKnowledgeBase(name, text);

    return NextResponse.json(kbResponse, { status: 201 });

  } catch (error) {
    console.error("[API /knowledge-base/text] Error adding text to KB:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;

    if (errorMessage.includes("ElevenLabs API key is not configured")) {
        statusCode = 503;
    } else if (errorMessage.startsWith("Failed to add text to ElevenLabs Knowledge Base")) {
        const match = errorMessage.match(/Failed to add text to ElevenLabs Knowledge Base: (\d{3})/);
        if (match && match[1]) {
            statusCode = parseInt(match[1], 10);
        } else {
            statusCode = 502;
        }
    } else if (errorMessage === "Name and text are required to add to knowledge base.") {
        statusCode = 400;
    }

    return NextResponse.json(
      { message: "Failed to add text to knowledge base", details: errorMessage },
      { status: statusCode }
    );
  }
}