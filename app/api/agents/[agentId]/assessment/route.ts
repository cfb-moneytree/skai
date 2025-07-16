import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { agentId: elevenlabsAgentIdText } = await params;
  const { quizzes_data: quizzesData, deleted_quiz_ids: deletedQuizIds } = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agentRecord, error: agentFetchError } = await supabase
    .from("user_elevenlabs_agents")
    .select("id")
    .eq("elevenlabs_agent_id", elevenlabsAgentIdText)
    .single();

  if (agentFetchError) {
    if (agentFetchError.code === "PGRST116") {
      return NextResponse.json(
        { message: `Agent with ID ${elevenlabsAgentIdText} not found.` },
        { status: 404 }
      );
    }
    console.error("Error fetching agent:", agentFetchError);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }

  if (!agentRecord) {
    return NextResponse.json(
      { message: `Agent with ID ${elevenlabsAgentIdText} not found.` },
      { status: 404 }
    );
  }

  const agentUuidToUse = agentRecord.id;

  const newQuizzes = [];
  const updatedQuizzes = [];

  for (const quizData of quizzesData) {
    let question_media_path = quizData.question_media;


    const quizPayload: any = {
      agent_id: agentUuidToUse,
      question: quizData.question,
      quiz_desc: quizData.quiz_desc,
      question_media: question_media_path,
      options: quizData.options,
      correct_option: quizData.correct_option,
      media_type: quizData.media_type,
    };

    if (quizData.id) {
      updatedQuizzes.push({ ...quizPayload, id: quizData.id });
    } else {
      newQuizzes.push(quizPayload);
    }
  }

  if (deletedQuizIds && deletedQuizIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("quiz")
      .delete()
      .in("id", deletedQuizIds);
    if (deleteError) {
      console.error("Error deleting quizzes:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete quizzes" },
        { status: 500 }
      );
    }
  }

  if (newQuizzes.length > 0) {
    const { error: insertError } = await supabase.from("quiz").insert(newQuizzes);
    if (insertError) {
      console.error("Error inserting new quizzes:", insertError);
      return NextResponse.json(
        { error: "Failed to save new quizzes" },
        { status: 500 }
      );
    }
  }

  if (updatedQuizzes.length > 0) {
    for (const quiz of updatedQuizzes) {
      const { error: updateError } = await supabase
        .from("quiz")
        .update(quiz)
        .eq("id", quiz.id);
      if (updateError) {
        console.error(`Error updating quiz ${quiz.id}:`, updateError);
        return NextResponse.json(
          { error: `Failed to update quiz ${quiz.id}` },
          { status: 500 }
        );
      }
    }
  }

  const { data, error } = await supabase.from("quiz").select().eq("agent_id", agentUuidToUse);

  if (error) {
    console.error("Error saving quizzes:", error);
    return NextResponse.json(
      { error: "Failed to save quizzes" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { agentId: elevenlabsAgentIdText } = await params;

  try {
    const { data: agentRecord, error: agentFetchError } = await supabase
      .from("user_elevenlabs_agents")
      .select("id")
      .eq("elevenlabs_agent_id", elevenlabsAgentIdText)
      .single();

    if (agentFetchError) {
      if (agentFetchError.code === "PGRST116") {
        return NextResponse.json(
          { message: `Agent with ID ${elevenlabsAgentIdText} not found.` },
          { status: 404 }
        );
      }
      throw agentFetchError;
    }

    if (!agentRecord) {
      return NextResponse.json(
        { message: `Agent with ID ${elevenlabsAgentIdText} not found.` },
        { status: 404 }
      );
    }

    const agentUuidToUse = agentRecord.id;

    const { data: quizzesData, error } = await supabase
      .from("quiz")
      .select("*")
      .eq("agent_id", agentUuidToUse);

    if (error) {
      throw error;
    }

    const quizzesWithSignedUrls = await Promise.all(
      quizzesData.map(async (quiz) => {
        let signed_media_url: string | null = null;
        if (quiz.question_media) {
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from("assessments")
              .createSignedUrl(quiz.question_media, 60 * 5);

          if (signedUrlError) {
            console.error(
              `Error creating signed URL for media ${quiz.question_media}:`,
              signedUrlError
            );
          } else {
            signed_media_url = signedUrlData?.signedUrl ?? null;
          }
        }
        return { ...quiz, signed_media_url };
      })
    );

    return NextResponse.json(quizzesWithSignedUrls);
  } catch (error: any) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
