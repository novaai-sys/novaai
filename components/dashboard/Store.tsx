"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessSettings, GoogleConnection, Location, Review } from "@/lib/types";
import { PROFILE_COLUMNS, toUsage, type Usage } from "@/lib/usage";

export type DashboardUser = { id: string; email: string };

export type TestReviewInput = {
  reviewerName: string;
  rating: number;
  reviewText: string;
};

type Store = {
  user: DashboardUser;
  loading: boolean;
  /** Set when loading failed; the dashboard shows it with setup hints. */
  loadError: string | null;
  /** Set when the last save failed. */
  saveError: string | null;
  settings: BusinessSettings;
  reviews: Review[];
  /** Plan and AI-reply usage. null when `profiles` could not be read. */
  credits: Usage | null;
  locations: Location[];
  google: GoogleConnection | null;
  updateSettings: (patch: Partial<Omit<BusinessSettings, "user_id">>) => Promise<boolean>;
  /** Approve & publish, or update a published reply. Returns an error or null. */
  publish: (id: string, reply?: string) => Promise<string | null>;
  /** New AI draft for a review waiting for approval. Returns an error or null. */
  regenerate: (id: string) => Promise<string | null>;
  addTestReview: (input: TestReviewInput) => Promise<string | null>;
  setLocationAutoReply: (id: string, on: boolean) => Promise<void>;
  /** Re-reads plan, usage, locations and reviews from Supabase. */
  refresh: () => Promise<Usage | null>;
  /** Merges reviews returned by the API into the list. */
  mergeReviews: (rows: Review[]) => void;
  setCredits: (u: Usage) => void;
};

const Ctx = createContext<Store | null>(null);

const describe = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e && "message" in e
      ? String((e as { message: unknown }).message)
      : "Something went wrong.";

const normalize = (r: Review): Review => ({ ...r, id: String(r.id) });

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/**
 * Loads the signed-in user's settings, plan, locations and reviews from
 * Supabase. Settings and auto-reply switches are written directly (row level
 * security limits each user to their own rows); anything that generates or
 * publishes a reply goes through the API, which enforces the plan and the
 * star-rating rules.
 */
export function DashboardStore({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [credits, setCredits] = useState<Usage | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [google, setGoogle] = useState<GoogleConnection | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>({
    user_id: user.id,
    business_name: "My business",
    tone_of_voice: "Warm",
    autopilot_enabled: true,
    alert_email: user.email,
  });

  const loadSecondary = useCallback(async () => {
    const supabase = createClient();
    // Not fatal if missing: the SQL migration may not have run yet.
    const [profile, locs, conn] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).limit(1),
      supabase
        .from("locations")
        .select("id, title, address, google_location_id, auto_reply_enabled, last_synced_at")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("google_connections")
        .select("google_email, created_at")
        .eq("user_id", user.id)
        .limit(1),
    ]);
    const usage = profile.data?.[0] ? toUsage(profile.data[0]) : null;
    return {
      usage,
      locations: (locs.data ?? []) as Location[],
      google: (conn.data?.[0] ?? null) as GoogleConnection | null,
    };
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();

        const found = await supabase
          .from("business_settings")
          .select("*")
          .eq("user_id", user.id)
          .limit(1);
        if (found.error) throw found.error;

        let row = found.data?.[0] as BusinessSettings | undefined;
        if (!row) {
          // First visit: create this user's settings row.
          const created = await supabase
            .from("business_settings")
            .insert({
              user_id: user.id,
              business_name: "My business",
              tone_of_voice: "Warm",
              autopilot_enabled: true,
              alert_email: user.email,
            })
            .select()
            .limit(1);
          if (created.error) throw created.error;
          row = created.data?.[0] as BusinessSettings | undefined;
        }

        const list = await supabase
          .from("reviews")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (list.error) throw list.error;

        const extra = await loadSecondary();

        if (cancelled) return;
        if (row) setSettings(row);
        setCredits(extra.usage);
        setLocations(extra.locations);
        setGoogle(extra.google);
        setReviews((list.data ?? []).map(normalize));
      } catch (e) {
        if (!cancelled) setLoadError(describe(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id, user.email, loadSecondary]);

  const refresh = useCallback(async () => {
    const extra = await loadSecondary();
    const list = await createClient()
      .from("reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCredits(extra.usage);
    setLocations(extra.locations);
    setGoogle(extra.google);
    if (list.data) setReviews(list.data.map(normalize));
    return extra.usage;
  }, [loadSecondary, user.id]);

  const mergeReviews = useCallback((rows: Review[]) => {
    setReviews((current) => {
      const byId = new Map(current.map((r) => [r.id, r]));
      const added: Review[] = [];
      for (const raw of rows) {
        const r = normalize(raw);
        if (byId.has(r.id)) byId.set(r.id, r);
        else added.push(r);
      }
      return [...added, ...current.map((r) => byId.get(r.id)!)];
    });
  }, []);

  const updateSettings = useCallback<Store["updateSettings"]>(
    async (patch) => {
      const before = settings;
      setSettings({ ...settings, ...patch });
      setSaveError(null);
      try {
        const { error } = await createClient()
          .from("business_settings")
          .update(patch)
          .eq("user_id", user.id);
        if (error) throw error;
        return true;
      } catch (e) {
        setSettings(before);
        setSaveError(`Your change was not saved: ${describe(e)}`);
        return false;
      }
    },
    [settings, user.id],
  );

  const publish = useCallback<Store["publish"]>(
    async (id, reply) => {
      try {
        const { ok, status, json } = await postJson(
          `/api/reviews/${encodeURIComponent(id)}/publish`,
          reply === undefined ? {} : { reply },
        );
        if (json.review) mergeReviews([json.review]);
        return ok ? null : (json.error ?? `The request failed (${status}).`);
      } catch (e) {
        return describe(e);
      }
    },
    [mergeReviews],
  );

  const regenerate = useCallback<Store["regenerate"]>(
    async (id) => {
      try {
        const { ok, status, json } = await postJson("/api/reviews/process", { reviewId: id });
        if (json.credits) setCredits(json.credits as Usage);
        if (json.review) mergeReviews([json.review]);
        return ok ? null : (json.error ?? `The request failed (${status}).`);
      } catch (e) {
        return describe(e);
      }
    },
    [mergeReviews],
  );

  const addTestReview = useCallback<Store["addTestReview"]>(
    async (input) => {
      try {
        const { ok, status, json } = await postJson("/api/reviews/process", input);
        // The server is the source of truth for the counter.
        if (json.credits) setCredits(json.credits as Usage);
        if (!ok || !json.review) return json.error ?? `The request failed (${status}).`;
        mergeReviews([json.review]);
        return null;
      } catch (e) {
        return describe(e);
      }
    },
    [mergeReviews],
  );

  const setLocationAutoReply = useCallback<Store["setLocationAutoReply"]>(
    async (id, on) => {
      const before = locations;
      setLocations(locations.map((l) => (l.id === id ? { ...l, auto_reply_enabled: on } : l)));
      setSaveError(null);
      const { error } = await createClient()
        .from("locations")
        .update({ auto_reply_enabled: on })
        .eq("id", id);
      if (error) {
        setLocations(before);
        setSaveError(`Your change was not saved: ${error.message}`);
      }
    },
    [locations],
  );

  const value = useMemo<Store>(
    () => ({
      user,
      loading,
      loadError,
      saveError,
      settings,
      reviews,
      credits,
      locations,
      google,
      updateSettings,
      publish,
      regenerate,
      addTestReview,
      setLocationAutoReply,
      refresh,
      mergeReviews,
      setCredits,
    }),
    [
      user, loading, loadError, saveError, settings, reviews, credits, locations, google,
      updateSettings, publish, regenerate, addTestReview, setLocationAutoReply, refresh,
      mergeReviews,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useDashboard must be used inside DashboardStore");
  return store;
}

export const isPublished = (r: Review) => r.status === "published";
export const needsApproval = (r: Review) => r.status !== "published";
