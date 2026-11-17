import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Supabase client with the service role key. It bypasses row level
 * security, so use it only on the server and only for writes users must not
 * make themselves: Paddle webhook updates, Google tokens, locations.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local (Supabase > Project Settings > API > service_role) and restart the server.",
    );
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
