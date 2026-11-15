/** Rows as they are stored in Supabase. */

export type ReviewStatus = "pending" | "published";

export type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  ai_reply: string | null;
  status: ReviewStatus | string;
  created_at: string;
};

export type BusinessSettings = {
  user_id: string;
  business_name: string;
  tone_of_voice: string;
  autopilot_enabled: boolean;
  alert_email: string | null;
};
