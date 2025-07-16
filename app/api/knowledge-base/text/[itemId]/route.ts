import { NextResponse } from "next/server";
import { getElevenLabsKnowledgeBaseItemText } from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const supabase = await createSupabaseServerClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { itemId: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { message: "Knowledge base item ID is required." },
        { status: 400 }
      );
    }

    const textContent = await getElevenLabsKnowledgeBaseItemText(itemId);

    if (textContent === null) {
      return NextResponse.json(
        { message: "Knowledge base item not found, is not a text item, or has no content." },
        { status: 404 } 
      );
    }

    return NextResponse.json({ text: textContent }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;

    if (errorMessage.includes("ElevenLabs API key is not configured")) {
        statusCode = 503;
    } else if (errorMessage.startsWith("Failed to fetch knowledge base item details")) {
        const match = errorMessage.match(/Failed to fetch knowledge base item details: (\d{3})/);
        if (match && match[1]) {
            statusCode = parseInt(match[1], 10);
        } else {
            statusCode = 502;
        }
    } else if (errorMessage === "Knowledge base item ID is required."){
        statusCode = 400;
    }
    
    return NextResponse.json(
      { message: "Failed to fetch knowledge base item text", details: errorMessage },
      { status: statusCode }
    );
  }
}