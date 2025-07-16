import { NextResponse } from "next/server";
import { createElevenLabsAgent, AgentDataFromUI } from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const agentData: AgentDataFromUI = {
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

    if (
      !agentData.name ||
      !agentData.language ||
      !agentData.voice_id 
    ) {
      return NextResponse.json(
        { message: "Missing required agent data fields." },
        { status: 400 }
      );
    }

    if (agentData.passing_score && (agentData.passing_score < 0 || agentData.passing_score > 100)) {
      return NextResponse.json(
        { message: "Passing score must be between 0 and 100." },
        { status: 400 }
      );
    }

    const createdElevenLabsAgent = await createElevenLabsAgent(agentData);

    if (!createdElevenLabsAgent || !createdElevenLabsAgent.agent_id) {
      return NextResponse.json(
        { message: "Failed to create agent (unexpected response)." },
        { status: 500 }
      );
    }

    let coverImagePath: string | null = null;
    if (coverImageFile) {
      const filePath = `slide_covers/${createdElevenLabsAgent.agent_id}-${coverImageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('lessons')
        .upload(filePath, coverImageFile);

      if (uploadError) {
        console.error("[API /agents/create] Supabase storage error:", uploadError);
        return NextResponse.json(
          { message: "Failed to upload cover image.", details: uploadError.message },
          { status: 500 }
        );
      }
      coverImagePath = filePath;
    }

    const { data: dbData, error: dbError } = await supabase
      .from("user_elevenlabs_agents")
      .insert([
        {
          user_id: user.id,
          elevenlabs_agent_id: createdElevenLabsAgent.agent_id,
          agent_name: agentData.name,
          language: agentData.language,
          voice_id: agentData.voice_id,
          instructions: agentData.instructions,
          first_message: agentData.firstMessage,
          evaluation_criteria: agentData.evaluation_criteria,
          cover_image: coverImagePath,
          passing_score: agentData.passing_score,
          category_id: agentData.category_id,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("[API /agents/elevenlabs/create] Supabase error:", dbError);
      return NextResponse.json(
        { message: "Agent created on ElevenLabs, but failed to save to application database.", details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Agent created successfully and mapping stored.",
      elevenLabsAgentId: createdElevenLabsAgent.agent_id,
      databaseRecord: dbData,
    }, { status: 201 });

  } catch (error) {
    console.error("[API /agents/elevenlabs/create] Error creating agent:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;
    if (errorMessage === "ElevenLabs API key is not configured.") {
        statusCode = 503;
    } else if (errorMessage.startsWith("Failed to create agent via ElevenLabs")) {
        statusCode = 502;
    }

    return NextResponse.json(
      { message: "Failed to create agent", details: errorMessage },
      { status: statusCode }
    );
  }
}