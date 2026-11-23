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
  /** 'dashboard' | 'google' | 'api' */
  source?: string;
  external_id?: string | null;
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
  last_sync_error?: string | null;
  last_sync_new?: number;
};

export type GoogleConnection = {
  google_email: string | null;
  created_at: string;
  /** 'active' | 'needs_reconnect' */
  status?: string;
  last_error?: string | null;
};

/** Delivery state of one post-call follow-up (owner text, email, caller text). */
export type FollowUpStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

/** A call Jessica answered, as the client's dashboard reads it (calls table). */
export type CallRow = {
  call_id: string;
  created_at: string;
  started_at: string | null;
  duration_ms: number | null;
  from_number: string;
  to_number: string;
  outcome: "" | "booked" | "lead" | "hang_up" | "spam" | "voicemail";
  customer_name: string;
  summary: string;
  user_sentiment: string;
  recording_url: string;
  transcript: string;
  analysis: { custom_analysis_data?: Record<string, unknown>; call_summary?: string } | null;
  sms_status: FollowUpStatus;
  sms_to: string;
  sms_body: string;
  sms_error: string;
  email_status: FollowUpStatus;
  email_to: string;
  email_subject: string;
  email_error: string;
  caller_sms_status: FollowUpStatus;
  caller_sms_to: string;
  caller_sms_body: string;
  caller_sms_error: string;
};

/** A client's business line and its post-call settings (businesses table). */
export type BusinessRow = {
  id: string;
  name: string;
  retell_agent_id: string;
  owner_phone: string | null;
  sms_enabled: boolean;
  notify_email: string | null;
  email_enabled: boolean;
  caller_sms_enabled: boolean;
  caller_sms_booked_template: string | null;
  caller_sms_followup_template: string | null;
  followup_link: string;
};
