import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured, missingEnvMessage } from "@/lib/supabase/env";
import { PipelineError } from "./process";

/** Runs a review handler for the signed-in user and turns errors into JSON. */
export async function withUser(
  run: (ctx: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    userId: string;
  }) => Promise<unknown>,
) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: missingEnvMessage }, { status: 500 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  }
  try {
    return NextResponse.json(await run({ supabase, userId: data.user.id }));
  } catch (e) {
    if (e instanceof PipelineError) {
      return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
