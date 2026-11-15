"use client";

import { useDashboard } from "./Store";

/** Shows a loading or setup message until the dashboard data is ready. */
export default function StoreGate({ children }: { children: React.ReactNode }) {
  const { loading, loadError, saveError } = useDashboard();

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5">
        <p role="status" className="text-[15px] text-mist">
          Loading your dashboard…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[44rem] px-5 py-16 md:px-10">
        <h1 className="text-[clamp(1.9rem,3.4vw,2.75rem)] font-medium leading-none tracking-[-0.03em]">
          The dashboard could not load your data.
        </h1>
        <p className="mt-5 rounded-xl border border-star/30 bg-star/10 p-4 text-[14px] leading-relaxed text-star">
          {loadError}
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-mist">
          <li>
            Check that the <code>business_settings</code> and{" "}
            <code>reviews</code> tables exist with the columns in{" "}
            <code>supabase/schema.sql</code>.
          </li>
          <li>
            If row level security is on, add the two policies at the bottom of
            that file.
          </li>
          <li>
            Check the Supabase URL and anon key in <code>.env.local</code>,
            then restart the server.
          </li>
        </ul>
      </div>
    );
  }

  return (
    <>
      {saveError && (
        <p
          role="alert"
          className="border-b border-star/30 bg-star/10 px-5 py-3 text-[14px] text-star md:px-10"
        >
          {saveError}
        </p>
      )}
      {children}
    </>
  );
}
