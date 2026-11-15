import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "@/lib/supabase/env";

/**
 * Runs before dashboard, auth and API requests. Refreshes the Supabase
 * session cookie, sends signed-out visitors away from /dashboard, and sends
 * signed-in visitors past /login and /signup.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isAuthPage = path === "/login" || path === "/signup";

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!supabaseConfigured) {
    return isDashboard ? redirectTo("/login") : NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let signedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    signedIn = false;
  }

  if (isDashboard && !signedIn) return redirectTo("/login");
  if (isAuthPage && signedIn) return redirectTo("/dashboard");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};
