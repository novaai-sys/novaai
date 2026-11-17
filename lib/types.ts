/** Rows as they are stored in Supabase. */

export type ReviewStatus = "pending_approval" | "published";

export type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  ai_reply: string | null;
  status: ReviewStatus | string;
  created_at: string;
  location_id?: string | null;
  google_review_name?: string | null;
  auto_published?: boolean;
  published_at?: string | null;
  posted_to_google_at?: string | null;
  publish_error?: string | null;
};

export type BusinessSettings = {
  user_id: string;
  business_name: string;
  tone_of_voice: string;
  autopilot_enabled: boolean;
  alert_email: string | null;
};

export type Location = {
  id: string;
  title: string;
  address: string | null;
  google_location_id: string;
  auto_reply_enabled: boolean;
  last_synced_at: string | null;
};

export type GoogleConnection = {
  google_email: string | null;
  created_at: string;
};
