import { NextResponse } from "next/server";
import { getElevenLabsVoices } from "@/lib/elevenlabs/api";

export async function GET() {
  try {
    const voices = await getElevenLabsVoices();
    return NextResponse.json(voices);
  } catch (error) {
    console.error("[API /elevenlabs/voices] Error fetching voices:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to fetch voices", details: errorMessage },
      { status: 500 }
    );
  }
}