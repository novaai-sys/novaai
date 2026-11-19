"use client";

import { useDashboard } from "./Store";

export const CONNECT_URL = "/api/auth/google-business";

const primary =
  "inline-flex items-center gap-3 rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white";

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

/**
 * The one-click connect prompt, shown wherever Google isn't connected yet,
 * and a reconnect prompt when Google access has lapsed.
 */
export default function GoogleConnectCard({ compact = false }: { compact?: boolean }) {
  const { google } = useDashboard();

  if (google?.status === "needs_reconnect") {
    return (
      <div role="alert" className="rise rounded-card border border-star/30 bg-star/10 p-6 md:p-7">
        <h2 className="text-[17px] font-medium text-fog">Reconnect Google to keep replying</h2>
        <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-mist">
          {google.last_error ?? "Google no longer accepts NovaAI's access."} Nova has paused
          syncing your reviews until you reconnect.
        </p>
        <a href={CONNECT_URL} className={`${primary} mt-5`}>
          <GoogleMark /> Reconnect Google
        </a>
      </div>
    );
  }

  if (google) return null;

  return (
    <div className="rise relative overflow-hidden rounded-card border border-ice/30 bg-panel p-6 md:p-8">
      <div
        aria-hidden="true"
        className="orb-rim pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25"
      />
      <div className="relative">
        <h2 className="text-[clamp(1.25rem,2.2vw,1.6rem)] font-medium leading-tight tracking-[-0.02em]">
          Connect your Google Business Profile
        </h2>
        {!compact && (
          <ul className="mt-4 space-y-2 text-[15px] text-mist">
            <li>Nova checks for new reviews every 15 minutes.</li>
            <li>Replies to 4 and 5-star reviews go out automatically when Auto-reply is on.</li>
            <li>Replies to 1 to 3-star reviews always wait for your approval.</li>
          </ul>
        )}
        <a href={CONNECT_URL} className={`${primary} mt-6`}>
          <GoogleMark /> Connect Google Business Profile
        </a>
        <p className="mt-3 text-[13px] text-ghost">
          You sign in on Google&apos;s own page. NovaAI never sees your password, and you can
          disconnect at any time.
        </p>
      </div>
    </div>
  );
}
