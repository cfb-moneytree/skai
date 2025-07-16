import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadFileToElevenLabsKnowledgeBase,
  updateAgentKnowledgeBase,
  triggerElevenLabsRagIndexing,
  type KnowledgeBaseItem,
} from '@/lib/elevenlabs/api';

interface ClientSlidePayload {
  id?: string;
  client_temp_id: string;
  title: string;
  slide_order: number;
  content_type: 'image_text' | 'video';
  talking_points?: string;
  image_path?: string;
  video_path?: string;
}


export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId: elevenlabsAgentIdText } = await params;
  const supabase = await createSupabaseServerClient();
  const logPrefix = `[API /api/agents/${elevenlabsAgentIdText}/lessons GET]`;

  if (!elevenlabsAgentIdText || typeof elevenlabsAgentIdText !== 'string' || elevenlabsAgentIdText.trim() === '') {
    console.warn(`${logPrefix} Invalid or missing elevenlabsAgentIdText in path: ${elevenlabsAgentIdText}`);
    return NextResponse.json({ message: 'Agent ID is missing or invalid in the URL path.' }, { status: 400 });
  }

  try {
    console.log(`${logPrefix} Fetching internal UUID for elevenlabs_agent_id: ${elevenlabsAgentIdText}`);
    const { data: agentRecord, error: agentFetchError } = await supabase
      .from('user_elevenlabs_agents')
      .select('id')
      .eq('elevenlabs_agent_id', elevenlabsAgentIdText)
      .single();

    if (agentFetchError) {
      if (agentFetchError.code === 'PGRST116') {
        console.warn(`${logPrefix} Agent with elevenlabs_agent_id ${elevenlabsAgentIdText} not found.`);
        return NextResponse.json({ message: `Agent with ID ${elevenlabsAgentIdText} not found.` }, { status: 404 });
      }
      console.error(`${logPrefix} Error fetching agent internal ID:`, agentFetchError);
      throw agentFetchError;
    }

    if (!agentRecord || !agentRecord.id) {
      console.warn(`${logPrefix} Agent record or internal ID not found for ${elevenlabsAgentIdText}.`);
      return NextResponse.json({ message: `Agent with ID ${elevenlabsAgentIdText} not found.` }, { status: 404 });
    }

    const agentUuidToUse = agentRecord.id;
    console.log(`${logPrefix} Internal UUID ${agentUuidToUse} found. Fetching lesson slides.`);

    const { data: slidesData, error: slidesError } = await supabase
      .from('agent_lessons_slides')
      .select('id, agent_id, image_path, video_path, content_type, title, talking_points, slide_order, created_at, updated_at')
      .eq('agent_id', agentUuidToUse)
      .order('slide_order', { ascending: true });

    if (slidesError) {
      console.error(`${logPrefix} Error fetching slides:`, slidesError);
      throw slidesError;
    }

    if (!slidesData) {
      return NextResponse.json([]);
    }

    const slidesWithSignedUrls = await Promise.all(
      slidesData.map(async (slide) => {
        let signed_image_url: string | null = null;
        let signed_video_url: string | null = null;

        if (slide.content_type === 'image_text' && slide.image_path) {
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('lessons')
            .createSignedUrl(slide.image_path, 60 * 5);

          if (signedUrlError) {
            console.error(`${logPrefix} Error creating signed URL for image ${slide.image_path}:`, signedUrlError);
          } else {
            signed_image_url = signedUrlData?.signedUrl ?? null;
          }
        } else if (slide.content_type === 'video' && slide.video_path) {
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('lessons')
            .createSignedUrl(slide.video_path, 60 * 5);
          
          if (signedUrlError) {
            console.error(`${logPrefix} Error creating signed URL for video ${slide.video_path}:`, signedUrlError);
          } else {
            signed_video_url = signedUrlData?.signedUrl ?? null;
          }
        }
        return { ...slide, signed_image_url, signed_video_url };
      })
    );

    return NextResponse.json(slidesWithSignedUrls);

  } catch (error: any) {
    console.error(`${logPrefix} Error:`, error);
    return NextResponse.json({ message: error.message || 'Internal Server Error', details: error.details }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId: elevenlabsAgentIdText } = await params;
  const supabase = await createSupabaseServerClient();
  const logPrefix = `[API /api/agents/${elevenlabsAgentIdText}/lessons POST]`;

  if (!elevenlabsAgentIdText || typeof elevenlabsAgentIdText !== 'string' || elevenlabsAgentIdText.trim() === '') {
    console.warn(`${logPrefix} Invalid or missing elevenlabsAgentIdText in path: ${elevenlabsAgentIdText}`);
    return NextResponse.json({ message: 'Agent ID is missing or invalid in the URL path.' }, { status: 400 });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    console.log(`${logPrefix} Fetching internal UUID for elevenlabs_agent_id: ${elevenlabsAgentIdText}`);
    const { data: agentRecord, error: agentFetchError } = await supabase
      .from('user_elevenlabs_agents')
      .select('id')
      .eq('elevenlabs_agent_id', elevenlabsAgentIdText)
      .single();

    if (agentFetchError) {
      if (agentFetchError.code === 'PGRST116') {
        console.warn(`${logPrefix} Agent with elevenlabs_agent_id ${elevenlabsAgentIdText} not found.`);
        return NextResponse.json({ message: `Agent with ID ${elevenlabsAgentIdText} not found.` }, { status: 404 });
      }
      console.error(`${logPrefix} Error fetching agent internal ID:`, agentFetchError);
      throw agentFetchError;
    }

    if (!agentRecord || !agentRecord.id) {
      console.warn(`${logPrefix} Agent record or internal ID not found for ${elevenlabsAgentIdText}.`);
      return NextResponse.json({ message: `Agent with ID ${elevenlabsAgentIdText} not found.` }, { status: 404 });
    }
    const agentUuidToUse = agentRecord.id;
    console.log(`${logPrefix} Internal UUID ${agentUuidToUse} found. Processing slides.`);


    const { slides_data: clientSlides, elevenlabs_pdf_supabase_path: elevenlabsPdfSupabasePath } = await request.json();

    if (!clientSlides) {
      return NextResponse.json({ message: "Missing 'slides_data' in request body." }, { status: 400 });
    }
    if (!elevenlabsPdfSupabasePath) {
      console.warn(`${logPrefix} Missing 'elevenlabs_pdf_supabase_path' in request body.`);
      return NextResponse.json({ message: "Missing default path." }, { status: 400 });
    }

    const { data: existingDbSlides, error: fetchError } = await supabase
      .from('agent_lessons_slides')
      .select('id, image_path, video_path, content_type')
      .eq('agent_id', agentUuidToUse);

    if (fetchError) {
      console.error(`${logPrefix} Error fetching existing slides:`, fetchError);
      throw fetchError;
    }
    const existingDbSlidesMap = new Map(existingDbSlides?.map(s => [s.id, { image_path: s.image_path, video_path: s.video_path, content_type: s.content_type }]));

    const newSlidesToInsert: any[] = [];
    const existingSlidesToUpdate: any[] = [];
    const processedClientSlideIds = new Set<string>();
    
    const storageObjectsToDelete: string[] = [];
    
    for (const clientSlide of clientSlides) {
      const slideDbId = clientSlide.id || uuidv4();
      processedClientSlideIds.add(slideDbId);

      const existingSlideData = clientSlide.id ? existingDbSlidesMap.get(clientSlide.id) : null;

      let image_path_to_save: string | null = null;
      let video_path_to_save: string | null = null;
      let talking_points_to_save: string | null = null;

      if (clientSlide.content_type === 'image_text') {
          talking_points_to_save = clientSlide.talking_points || "";
          image_path_to_save = clientSlide.image_path || null;
      } else if (clientSlide.content_type === 'video') {
          video_path_to_save = clientSlide.video_path || null;
      }

      if (existingSlideData) {
          if (existingSlideData.image_path && existingSlideData.image_path !== image_path_to_save) {
              storageObjectsToDelete.push(existingSlideData.image_path);
          }
          if (existingSlideData.video_path && existingSlideData.video_path !== video_path_to_save) {
              storageObjectsToDelete.push(existingSlideData.video_path);
          }
      }

      const slidePayloadForDb = {
          agent_id: agentUuidToUse,
          title: clientSlide.title,
          slide_order: clientSlide.slide_order,
          content_type: clientSlide.content_type,
          talking_points: talking_points_to_save,
          image_path: image_path_to_save,
          video_path: video_path_to_save,
          updated_at: new Date().toISOString(),
      };

      if (clientSlide.id) {
          existingSlidesToUpdate.push({ id: slideDbId, ...slidePayloadForDb });
      } else {
          newSlidesToInsert.push({ id: slideDbId, ...slidePayloadForDb, created_at: new Date().toISOString() });
      }
    }

    const slideIdsToDeleteFromDb: string[] = [];
    if (existingDbSlides) {
      for (const dbSlide of existingDbSlides) {
        if (!processedClientSlideIds.has(dbSlide.id)) {
          slideIdsToDeleteFromDb.push(dbSlide.id);
          if (dbSlide.image_path) storageObjectsToDelete.push(dbSlide.image_path);
          if (dbSlide.video_path) storageObjectsToDelete.push(dbSlide.video_path);
        }
      }
    }
    
    if (storageObjectsToDelete.length > 0) {
      const uniquePathsToDelete = [...new Set(storageObjectsToDelete.filter(p => p))];
      if (uniquePathsToDelete.length > 0) {
        console.log(`${logPrefix} Deleting old media from storage:`, uniquePathsToDelete);
        const { error: deleteStorageError } = await supabase.storage
          .from('lessons')
          .remove(uniquePathsToDelete);
        if (deleteStorageError) {
          console.error(`${logPrefix} Error deleting media from storage:`, deleteStorageError);
        }
      }
    }

    if (newSlidesToInsert.length > 0) {
      console.log(`${logPrefix} Inserting ${newSlidesToInsert.length} new slides to DB. Data:`, JSON.stringify(newSlidesToInsert, null, 2));
      const { error: insertError } = await supabase
        .from('agent_lessons_slides')
        .insert(newSlidesToInsert);

      if (insertError) {
        console.error(`${logPrefix} Supabase error inserting new slides:`, insertError);
        throw insertError;
      }
    }

    if (existingSlidesToUpdate.length > 0) {
      console.log(`${logPrefix} Updating ${existingSlidesToUpdate.length} existing slides in DB. Data:`, JSON.stringify(existingSlidesToUpdate, null, 2));
      for (const slideToUpdate of existingSlidesToUpdate) {
        const { id, ...updateData } = slideToUpdate;
        const { error: updateError } = await supabase
          .from('agent_lessons_slides')
          .update(updateData)
          .eq('id', id);
        if (updateError) {
          console.error(`${logPrefix} Supabase error updating slide ID ${id}:`, updateError);
          throw updateError;
        }
      }
    }

    if (slideIdsToDeleteFromDb.length > 0) {
      console.log(`${logPrefix} Deleting ${slideIdsToDeleteFromDb.length} slides from DB.`);
      const { error: deleteDbError } = await supabase
        .from('agent_lessons_slides')
        .delete()
        .in('id', slideIdsToDeleteFromDb);

      if (deleteDbError) {
        console.error(`${logPrefix} Supabase error deleting slides:`, deleteDbError);
        throw deleteDbError;
      }
    }

    try {
      console.log(`${logPrefix} Starting ElevenLabs integration. PDF path from Supabase: ${elevenlabsPdfSupabasePath}`);

      const { data: pdfFileData, error: downloadError } = await supabase
        .storage
        .from('lessons')
        .download(elevenlabsPdfSupabasePath);

      if (downloadError) {
        console.error(`${logPrefix} Error downloading PDF for ElevenLabs from Supabase (${elevenlabsPdfSupabasePath}):`, downloadError);
        throw new Error(`Failed to download PDF from storage for ElevenLabs: ${downloadError.message}`);
      }
      if (!pdfFileData) {
        throw new Error(`No data returned when downloading PDF ${elevenlabsPdfSupabasePath} from storage for ElevenLabs.`);
      }
      const pdfBuffer = Buffer.from(await pdfFileData.arrayBuffer());

      const pdfFileNameForElevenLabs = elevenlabsPdfSupabasePath.split('/').pop() || `lesson-${elevenlabsAgentIdText}-${uuidv4()}.pdf`;
      
      console.log(`${logPrefix} Uploading PDF (${pdfFileNameForElevenLabs}, size: ${pdfBuffer.length} bytes) to ElevenLabs KB...`);
      const kbFile = await uploadFileToElevenLabsKnowledgeBase(pdfBuffer, pdfFileNameForElevenLabs, 'application/pdf');
      console.log(`${logPrefix} Successfully uploaded to ElevenLabs KB. File ID: ${kbFile.id}, Name: ${kbFile.name}`);

      const knowledgeBaseItems: KnowledgeBaseItem[] = [{
        id: kbFile.id,
        name: kbFile.name,
        type: 'file'
      }];
      
      console.log(`${logPrefix} Updating agent ${elevenlabsAgentIdText} knowledge base on ElevenLabs...`);
      await updateAgentKnowledgeBase(elevenlabsAgentIdText, knowledgeBaseItems);
      console.log(`${logPrefix} Successfully updated agent ${elevenlabsAgentIdText} knowledge base on ElevenLabs.`);

      console.log(`${logPrefix} Triggering RAG indexing for ElevenLabs KB file ID: ${kbFile.id}`);
      await triggerElevenLabsRagIndexing(kbFile.id);
      console.log(`${logPrefix} Successfully triggered RAG indexing for KB file ID: ${kbFile.id}`);

    } catch (elevenLabsError: any) {
      console.error(`${logPrefix} Error during ElevenLabs integration:`, elevenLabsError);
      throw new Error(`ElevenLabs integration failed: ${elevenLabsError.message}`);
    }

    console.log(`${logPrefix} Slides and ElevenLabs sync processed successfully for agent (text ID: ${elevenlabsAgentIdText}, UUID: ${agentUuidToUse}).`);
    return NextResponse.json({ message: "Slides saved and synced successfully." }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} General error in POST handler:`, error);
    let errorMessage = "An unknown error occurred.";
    let errorDetails = undefined;
    let statusCode = 500;

    if (error && typeof error === "object") {
      errorMessage = error.message || errorMessage;
      if ("details" in error) errorDetails = error.details;
    }
    return NextResponse.json(
      { message: "Failed to process slides.", details: errorDetails || errorMessage },
      { status: statusCode }
    );
  }
}
