import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/supabase/server";
import { authorizationUrl, googleConfigured } from "@/lib/google/business";

const STATE_COOKIE = "gbp_oauth_state";

/**
 * GET /api/auth/google-business/connect
 * Sends the signed-in user to Google's consent screen for Business Profile
 * access. A random state value in an httpOnly cookie protects the callback
 * against forged requests.
 */
export async function GET(request: NextRequest) {
  const back = (q: string) =>
    NextResponse.redirect(new URL(`/dashboard/locations?google=${q}`, request.url));

  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/dashboard/locations", request.url),
    );
  }
  if (!googleConfigured()) return back("not_configured");

  const state = randomBytes(32).toString("base64url");
  const res = NextResponse.redirect(
    authorizationUrl(request.nextUrl.origin, state),
  );
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/google-business",
    maxAge: 10 * 60,
  });
  return res;
}
