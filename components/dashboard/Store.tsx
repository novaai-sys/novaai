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
import type { BusinessSettings, Review } from "@/lib/types";
import { toUsage, type Usage } from "@/lib/usage";

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
  updateSettings: (patch: Partial<Omit<BusinessSettings, "user_id">>) => Promise<boolean>;
  publish: (id: string, reply?: string) => Promise<void>;
  addTestReview: (input: TestReviewInput) => Promise<string | null>;
};

const Ctx = createContext<Store | null>(null);

const describe = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e && "message" in e
      ? String((e as { message: unknown }).message)
      : "Something went wrong.";

/**
 * Loads the signed-in user's settings and reviews from Supabase and keeps
 * them in sync. Every change is written to the database; the screen updates
 * first and rolls back if the write fails.
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
  const [settings, setSettings] = useState<BusinessSettings>({
    user_id: user.id,
    business_name: "My business",
    tone_of_voice: "Warm",
    autopilot_enabled: true,
    alert_email: user.email,
  });

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

        // Plan and usage. Not fatal if missing: the dashboard still works,
        // and the API refuses to generate until the SQL files have run.
        const profile = await supabase
          .from("profiles")
          .select("plan, credits_used, credits_limit, trial_ends_at")
          .eq("id", user.id)
          .limit(1);
        const p = profile.data?.[0];

        if (cancelled) return;
        if (row) setSettings(row);
        if (p) setCredits(toUsage(p));
        setReviews(
          (list.data ?? []).map((r) => ({ ...r, id: String(r.id) })) as Review[],
        );
      } catch (e) {
        if (!cancelled) setLoadError(describe(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id, user.email]);

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
      const before = reviews;
      const patch: Partial<Review> = { status: "published" };
      if (reply !== undefined) patch.ai_reply = reply;
      setReviews(reviews.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      setSaveError(null);
      try {
        const { error } = await createClient()
          .from("reviews")
          .update(patch)
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } catch (e) {
        setReviews(before);
        setSaveError(`The reply was not saved: ${describe(e)}`);
      }
    },
    [reviews, user.id],
  );

  const addTestReview = useCallback<Store["addTestReview"]>(
    async (input) => {
      try {
        const res = await fetch("/api/generate-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            toneOfVoice: settings.tone_of_voice,
            businessName: settings.business_name,
          }),
        });
        const json = await res.json().catch(() => ({}));
        // The server is the source of truth for the counter.
        if (json.credits) setCredits(json.credits as Usage);
        if (!res.ok || !json.review) {
          return json.error ?? `The request failed (${res.status}).`;
        }
        const review = { ...json.review, id: String(json.review.id) } as Review;
        setReviews((rs) => [review, ...rs]);
        return null;
      } catch (e) {
        return describe(e);
      }
    },
    [settings.tone_of_voice, settings.business_name],
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
      updateSettings,
      publish,
      addTestReview,
    }),
    [user, loading, loadError, saveError, settings, reviews, credits, updateSettings, publish, addTestReview],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useDashboard must be used inside DashboardStore");
  return store;
}

export const isPublished = (r: Review) => r.status === "published";
