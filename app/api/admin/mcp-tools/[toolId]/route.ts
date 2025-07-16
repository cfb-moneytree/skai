import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteElevenLabsTool } from "@/lib/elevenlabs/api";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { toolId: toolId } = await params;
  const logPrefix = `[API /admin/mcp-tools/${toolId} DELETE]`;

  if (!toolId) {
    return NextResponse.json({ message: "Tool ID is required." }, { status: 400 });
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn(`${logPrefix} Unauthorized access attempt:`, authError?.message);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.user_metadata as any)?.role;
    if (userRole !== 'admin') {
      console.warn(`${logPrefix} Forbidden access attempt by user ${user.id} with role ${userRole}`);
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }

    console.log(`${logPrefix} Attempting to delete tool from ElevenLabs: ${toolId}`);
    await deleteElevenLabsTool(toolId);
    console.log(`${logPrefix} Successfully deleted tool from ElevenLabs (or it was already not found): ${toolId}`);

    console.log(`${logPrefix} Attempting to delete tool from Supabase mcp_tools table: ${toolId}`);
    const { error: dbDeleteError } = await supabase
      .from("mcp_tools")
      .delete()
      .eq("id", toolId);

    if (dbDeleteError) {
      console.error(`${logPrefix} Supabase error deleting tool from mcp_tools table:`, dbDeleteError);
    } else {
      console.log(`${logPrefix} Successfully deleted tool from Supabase mcp_tools table: ${toolId}`);
    }

    return NextResponse.json(
      { message: `Tool ${toolId} processed for deletion successfully.` },
      { status: 200 }
    );

  } catch (error) {
    console.error(`${logPrefix} Error deleting tool:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;
    if (errorMessage.includes("ElevenLabs API key is not configured")) {
        statusCode = 503;
    } else if (errorMessage.startsWith("Failed to delete tool")) {
        statusCode = 502;
    }
    return NextResponse.json(
      { message: "Failed to delete tool", details: errorMessage },
      { status: statusCode }
    );
  }
}