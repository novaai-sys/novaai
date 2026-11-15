import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { missingEnvMessage, supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components and Route Handlers. It reads the
 * session from cookies, so row level security applies as the signed-in user.
 */
export async function createClient() {
  if (!supabaseConfigured) throw new Error(missingEnvMessage);
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws. */
export async function getUser() {
  if (!supabaseConfigured) return null;
  try {
    // Reading the session depends on the request and the current time, so
    // tell Next.js this always runs at request time.
    await connection();
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
