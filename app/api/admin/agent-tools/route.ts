import { NextResponse } from "next/server";
import { getElevenLabsTools, SimplifiedToolInfo as ElevenLabsTool } from "@/lib/elevenlabs/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ToolInfoWithStatus extends ElevenLabsTool {
  isActive: boolean;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[API /admin/agent-tools] Unauthorized access attempt:", authError?.message);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const elevenLabsTools: ElevenLabsTool[] = await getElevenLabsTools();

    const { data: mcpToolsData, error: mcpToolsError } = await supabase
      .from("mcp_tools")
      .select("id, active");

    if (mcpToolsError) {
      console.error("[API /admin/agent-tools] Error fetching from mcp_tools:", mcpToolsError);
    }

    const activeToolsMap = new Map<string, boolean>();
    if (mcpToolsData) {
      for (const tool of mcpToolsData) {
        activeToolsMap.set(tool.id, tool.active);
      }
    }

    const toolsWithStatus: ToolInfoWithStatus[] = elevenLabsTools.map(tool => ({
      ...tool,
      isActive: activeToolsMap.get(tool.id) || false,
    }));

    return NextResponse.json(toolsWithStatus, { status: 200 });

  } catch (error) {
    console.error("[API /admin/agent-tools] Error fetching ElevenLabs tools:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    let statusCode = 500;

    if (errorMessage === "ElevenLabs API key is not configured.") {
      statusCode = 503;
    } else if (errorMessage.startsWith("Failed to fetch tools from ElevenLabs")) {
      statusCode = 502;
    }

    return NextResponse.json(
      { message: "Failed to fetch ElevenLabs tools", details: errorMessage },
      { status: statusCode }
    );
  }
}