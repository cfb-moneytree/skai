import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const { email, password } = await request.json();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${requestUrl.origin}/login`,
      data: {
        role: "admin",
      }
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Check email to continue sign in process" });
}