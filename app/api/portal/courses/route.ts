import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getElevenLabsAgentDetails } from "@/lib/elevenlabs/api";

const BUCKET_NAME = 'lessons';

async function processAgents(agents: any[], supabase: any) {
  const processedAgents = await Promise.all(
    agents.map(async (agent) => {
      const details = await getElevenLabsAgentDetails(agent.elevenlabs_agent_id);
      if (!details) {
        return null;
      }

      let imageUrl: string | null = null;
      let mediaType: 'image' | 'video' | 'none' = 'none';

      if (agent.cover_image) {
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(agent.cover_image, 3600);
        if (!urlError) {
          imageUrl = signedUrlData?.signedUrl || null;
          mediaType = 'image';
        }
      } else {
        const { data: slideData } = await supabase
          .from('agent_lessons_slides')
          .select('image_path')
          .eq('agent_id', agent.id)
          .order('slide_order', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (slideData?.image_path) {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(slideData.image_path, 3600);
          if (!urlError) {
            imageUrl = signedUrlData?.signedUrl || null;
            mediaType = 'image';
          }
        }
      }

      return {
        id: agent.id,
        title: agent.agent_name || 'Unnamed Course',
        image_url: imageUrl,
        media_type: mediaType,
        duration_placeholder: agent.duration_placeholder || "N/A",
        students_placeholder: agent.students_placeholder || "N/A",
      };
    })
  );
  return processedAgents.filter(agent => agent !== null);
}


export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  const categoryId = searchParams.get('categoryId');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name');

  if (categoriesError) {
    return NextResponse.json({ message: "Failed to fetch categories." }, { status: 500 });
  }

  const { data: assignedAgentsData, error: assignedAgentsError } = await supabase
    .from('user_agent_assignments')
    .select('agent_mapping_id')
    .eq('user_id', user.id);

  if (assignedAgentsError) {
    return NextResponse.json({ message: "Failed to fetch assigned courses." }, { status: 500 });
  }

  const assignedAgentIds = assignedAgentsData.map(a => a.agent_mapping_id);

  if (assignedAgentIds.length === 0) {
    return NextResponse.json({
      ongoingCourses: [],
      recommendedCourses: [],
     categories: [],
   });
  }

  const { data: progressData } = await supabase
    .from('user_agents_progress')
    .select('agent_id, is_complete')
    .eq('user_id', user.id)
    .in('agent_id', assignedAgentIds);

  const allProgressAgentIds = progressData ? progressData.map(p => p.agent_id) : [];
  const ongoingAgentIds = progressData ? progressData.filter(p => !p.is_complete).map(p => p.agent_id) : [];
  const recommendedAgentIds = assignedAgentIds.filter(id => !allProgressAgentIds.includes(id));

  let ongoingCourses: any[] = [];
  let ongoingCoursesCount = 0;
  if (ongoingAgentIds.length > 0) {
    const { data: agentsDetails } = await supabase
      .from('user_elevenlabs_agents')
      .select('id, agent_name, cover_image, elevenlabs_agent_id')
      .in('id', ongoingAgentIds);
    if (agentsDetails) {
      const validatedOngoing = await processAgents(agentsDetails, supabase);
      ongoingCourses = validatedOngoing;
    }
  }

  let recommendedCourses: any[] = [];
  let recommendedCoursesCount = 0;
  if (recommendedAgentIds.length > 0) {
    let query = supabase
      .from('user_elevenlabs_agents')
      .select('id, agent_name, cover_image, elevenlabs_agent_id, category_id')
      .in('id', recommendedAgentIds);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: agentsDetails } = await query;
    if (agentsDetails) {
      const validatedRecommended = await processAgents(agentsDetails, supabase);
      recommendedCourses = validatedRecommended;
    }
  }

  return NextResponse.json({
    ongoingCourses,
    recommendedCourses,
    categories,
  });
}