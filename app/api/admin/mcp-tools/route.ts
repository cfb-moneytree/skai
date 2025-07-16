import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface UpdateToolStatusPayload {
  toolId: string;
  isActive: boolean;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[API /admin/mcp-tools] Unauthorized access attempt:", authError?.message);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.user_metadata as any)?.role;
    if (userRole !== 'admin') {
      console.warn(`[API /admin/mcp-tools] Forbidden access attempt by user ${user.id} with role ${userRole}`);
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }

    const payloadArray: UpdateToolStatusPayload[] = await request.json();

    if (!Array.isArray(payloadArray) || payloadArray.some(p => !p.toolId || typeof p.isActive !== 'boolean')) {
      return NextResponse.json(
        { message: "Invalid payload: Expected an array of objects, each with toolId (string) and isActive (boolean)." },
        { status: 400 }
      );
    }

    if (payloadArray.length === 0) {
      return NextResponse.json(
        { message: "No tool statuses provided to update." },
        { status: 200 }
      );
    }

    const toolIdsInPayload = payloadArray.map(p => p.toolId);

    const { error: deactivateAllError } = await supabase
      .from("mcp_tools")
      .update({ active: false })
      .not('id', 'is', null);

    if (deactivateAllError) {
      console.error("[API /admin/mcp-tools] Supabase error deactivating all tools:", deactivateAllError);
      return NextResponse.json(
        { message: "Failed to deactivate all tool statuses.", details: deactivateAllError.message },
        { status: 500 }
      );
    }

    const toolsToActivate = payloadArray
      .filter(p => p.isActive)
      .map(p => ({ id: p.toolId, active: true }));

    let finalData: any[] | null = [];
    let updatedCount = 0;

    if (toolsToActivate.length > 0) {
      const { data: activateData, error: activateError } = await supabase
        .from("mcp_tools")
        .upsert(toolsToActivate, { onConflict: "id" })
        .select();

      if (activateError) {
        console.error("[API /admin/mcp-tools] Supabase error activating/upserting tools:", activateError);
        return NextResponse.json(
          { message: "Failed to activate tool statuses after deactivation.", details: activateError.message },
          { status: 500 }
        );
      }
      finalData = activateData;
      updatedCount = activateData?.length || 0;
    }
    
    return NextResponse.json(
      { message: "Tool statuses processed successfully.", processedActiveCount: updatedCount, activatedTools: finalData },
      { status: 200 }
    );

  } catch (error) {
    console.error("[API /admin/mcp-tools] Error updating tool status:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to update tool status", details: errorMessage },
      { status: 500 }
    );
  }
}