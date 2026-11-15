import { createBrowserClient } from "@supabase/ssr";
import { missingEnvMessage, supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./env";

/** Supabase client for Client Components. Uses the signed-in user's session. */
export function createClient() {
  if (!supabaseConfigured) throw new Error(missingEnvMessage);
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
