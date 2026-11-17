import "server-only";
import { decrypt } from "@/lib/crypto";

/**
 * Google OAuth and Business Profile API calls.
 *
 * Accounts and locations come from the v1 Account Management and Business
 * Information APIs; reviews and replies still live on the v4 My Business
 * API, whose paths combine both IDs: accounts/1/locations/2/reviews/3.
 *
 * All of this needs the Business Profile API access Google grants per
 * project. Before approval, API calls fail with a quota error; the OAuth
 * sign-in itself still works.
 */

export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
const SCOPES = [GBP_SCOPE, "openid", "email"];

/** Test hook: point every Google host at a local stand-in. Never set in production. */
const OVERRIDE = process.env.GOOGLE_API_BASE_URL_OVERRIDE?.replace(/\/$/, "");
const url = (host: string, path: string) =>
  OVERRIDE ? `${OVERRIDE}/${host}${path}` : `https://${host}${path}`;

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
  );
}

/** Must match an "Authorized redirect URI" on the Google Cloud OAuth client. */
export function redirectUri(origin: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || origin;
  return `${base}/api/auth/google-business/callback`;
}

export function authorizationUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // so a refresh token is returned on reconnect too
    include_granted_scopes: "true",
    state,
  });
  return `${url("accounts.google.com", "/o/oauth2/v2/auth")}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
};

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(url("oauth2.googleapis.com", "/token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GoogleError(
      `Google token request failed: ${json.error_description ?? json.error ?? res.status}`,
      res.status,
    );
  }
  return json as TokenResponse;
}

export const exchangeCode = (code: string, origin: string) =>
  tokenRequest({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(origin),
  });

/**
 * Email of the Google account from the ID token. The token came straight
 * from Google's token endpoint over TLS, so it is read without re-verifying
 * its signature, as OpenID Connect allows for this case.
 */
export function emailFromIdToken(idToken?: string) {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
    );
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function revokeToken(token: string) {
  await fetch(url("oauth2.googleapis.com", "/revoke"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}

export class GoogleError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** A short-lived access token from a stored, encrypted refresh token. */
export async function accessTokenFor(refreshTokenEncrypted: string) {
  const token = await tokenRequest({
    refresh_token: decrypt(refreshTokenEncrypted),
    grant_type: "refresh_token",
  });
  return token.access_token;
}

async function api<T>(accessToken: string, href: string, init?: RequestInit): Promise<T> {
  const res = await fetch(href, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GoogleError(
      `Google API ${res.status}: ${json?.error?.message ?? res.statusText}`,
      res.status,
    );
  }
  return json as T;
}

export type GoogleLocation = {
  accountId: string; // accounts/123
  locationId: string; // locations/456
  title: string;
  address: string | null;
};

export async function listLocations(accessToken: string): Promise<GoogleLocation[]> {
  const accounts = await api<{ accounts?: { name: string }[] }>(
    accessToken,
    url("mybusinessaccountmanagement.googleapis.com", "/v1/accounts"),
  );

  const out: GoogleLocation[] = [];
  for (const account of accounts.accounts ?? []) {
    let pageToken = "";
    do {
      const q = new URLSearchParams({
        readMask: "name,title,storefrontAddress",
        pageSize: "100",
      });
      if (pageToken) q.set("pageToken", pageToken);
      const page = await api<{
        locations?: {
          name: string;
          title?: string;
          storefrontAddress?: { addressLines?: string[]; locality?: string };
        }[];
        nextPageToken?: string;
      }>(
        accessToken,
        url(
          "mybusinessbusinessinformation.googleapis.com",
          `/v1/${account.name}/locations?${q}`,
        ),
      );
      for (const l of page.locations ?? []) {
        const a = l.storefrontAddress;
        out.push({
          accountId: account.name,
          locationId: l.name,
          title: l.title ?? "",
          address: a
            ? [...(a.addressLines ?? []), a.locality].filter(Boolean).join(", ") || null
            : null,
        });
      }
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  }
  return out;
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export type GoogleReview = {
  name: string; // accounts/1/locations/2/reviews/3
  reviewerName: string;
  rating: number;
  comment: string;
  createTime: string;
  hasReply: boolean;
};

/** The most recent reviews of one location (first page, newest first). */
export async function listRecentReviews(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<GoogleReview[]> {
  const q = new URLSearchParams({ pageSize: "50", orderBy: "updateTime desc" });
  const page = await api<{
    reviews?: {
      name: string;
      reviewer?: { displayName?: string };
      starRating?: string;
      comment?: string;
      createTime?: string;
      reviewReply?: { comment?: string };
    }[];
  }>(
    accessToken,
    url("mybusiness.googleapis.com", `/v4/${accountId}/${locationId}/reviews?${q}`),
  );
  return (page.reviews ?? [])
    .filter((r) => STARS[r.starRating ?? ""])
    .map((r) => ({
      name: r.name,
      reviewerName: r.reviewer?.displayName || "A Google user",
      rating: STARS[r.starRating!],
      comment: r.comment ?? "",
      createTime: r.createTime ?? new Date().toISOString(),
      hasReply: Boolean(r.reviewReply?.comment),
    }));
}

/** Creates or replaces the owner reply on a review. Max 4,096 bytes. */
export async function putReply(accessToken: string, reviewName: string, comment: string) {
  await api(accessToken, url("mybusiness.googleapis.com", `/v4/${reviewName}/reply`), {
    method: "PUT",
    body: JSON.stringify({ comment }),
  });
}
