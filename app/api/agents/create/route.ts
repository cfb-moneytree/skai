import { NextResponse } from "next/server";
import { createElevenLabsAgent, AgentDataFromUI as AgentDataFromAPIType } from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

interface AgentDataFromUI extends AgentDataFromAPIType {
  monthly_play_limit?: number;
}

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
    const agentData: any = {
      name: formData.get('name') as string,
      language: formData.get('language') as string,
      voice_id: formData.get('voice_id') as string,
      instructions: formData.get('instructions') as string,
      firstMessage: formData.get('firstMessage') as string,
      evaluation_criteria: JSON.parse(formData.get('evaluation_criteria') as string || '{}'),
      passing_score: parseFloat(formData.get('passing_score') as string),
      category_id: formData.get('category_id') as string,
    };
    const monthlyPlayLimit = formData.get('monthly_play_limit') as string | null;
    const coverImageFile = formData.get('cover_image') as File | null;

    if (
      !agentData.name ||
      !agentData.language ||
      !agentData.voice_id ||
      !monthlyPlayLimit
    ) {
      return NextResponse.json(
        { message: "Missing required fields. Name, language, voice, and monthly play limit are required." },
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

    if (monthlyPlayLimit !== null && monthlyPlayLimit !== '' && dbData) {
      console.log("[API /agents/create] Attempting to insert limit with value:", monthlyPlayLimit);
      
      const { data: limitData, error: limitError } = await supabase
        .from('app_limits')
        .upsert({
          limit_type: 'monthly_agent_play',
          value: parseInt(monthlyPlayLimit, 10),
          applies_to_agent_id: dbData.id,
          applies_to_user_id: null,
          applies_to_organization_id: null
        }, {
          onConflict: 'applies_to_agent_id',
          ignoreDuplicates: false
        });

      if (limitData) {
        console.log("[API /agents/create] Limit inserted successfully:", limitData);
      }

      if (limitError) {
        console.error("[API /agents/create] Supabase limit error:", limitError);
      }
    } else if (dbData) {
      // If the monthlyPlayLimit is null or an empty string, delete any existing limit
      const { error: deleteError } = await supabase
        .from('app_limits')
        .delete()
        .eq('limit_type', 'monthly_agent_play')
        .eq('applies_to_agent_id', dbData.id)
        .is('applies_to_user_id', null)
        .is('applies_to_organization_id', null);
        
      if (deleteError) {
        console.error("[API /agents/create] Supabase delete limit error:", deleteError);
      }
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