"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "../Logo";
import { createClient } from "@/lib/supabase/client";
import { isPublished, useDashboard } from "./Store";
import { planNames } from "@/lib/usage";

const nav = [
  { href: "/dashboard", label: "Reviews" },
  { href: "/dashboard/autopilot", label: "Autopilot" },
  { href: "/dashboard/tone", label: "Tone of voice" },
  { href: "/dashboard/locations", label: "Locations" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { reviews, settings, user, credits } = useDashboard();
  const [leaving, setLeaving] = useState(false);
  const awaiting = reviews.filter((r) => !isPublished(r)).length;

  const logOut = async () => {
    setLeaving(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  const logOutButton = (
    <button
      type="button"
      onClick={logOut}
      disabled={leaving}
      className="shrink-0 rounded-full px-3 py-1.5 text-[13px] text-mist transition-colors hover:bg-white/5 hover:text-fog disabled:opacity-50"
    >
      {leaving ? "Logging out…" : "Log out"}
    </button>
  );

  return (
    <aside className="border-b border-white/10 bg-panel/60 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-5 py-4 lg:px-6 lg:py-6">
        <Link href="/" aria-label="NovaAI home">
          <Logo className="text-[15px]" />
        </Link>
        <div className="lg:hidden">{logOutButton}</div>
      </div>

      <div className="hidden px-4 lg:block">
        <Link
          href="/dashboard/locations"
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
        >
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium">
              {settings.business_name || "My business"}
            </span>
            <span className="block text-[12px] text-mist">Your location</span>
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0 text-mist">
            <path d="M4.5 3 7.5 6l-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <nav
        aria-label="Dashboard"
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-6 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-0"
      >
        {nav.map((item) => {
          const current = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`flex shrink-0 items-center justify-between gap-3 rounded-full px-4 py-2 text-[14px] transition-colors lg:rounded-xl lg:py-2.5 ${
                current
                  ? "bg-white/10 text-fog"
                  : "text-mist hover:bg-white/5 hover:text-fog"
              }`}
            >
              {item.label}
              {item.href === "/dashboard" && awaiting > 0 && (
                <span className="rounded-full bg-star/15 px-2 py-0.5 text-[12px] tabular-nums text-star">
                  {awaiting}
                  <span className="sr-only"> waiting for you</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-white/10 p-4 lg:block">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lilac/20 text-[14px] font-medium uppercase text-lilac">
              {(user.email[0] ?? "N")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium" title={user.email}>
                {user.email}
              </span>
              <span className="block text-[12px] text-mist">
                {credits ? `${planNames[credits.plan]} plan` : "\u00a0"}
              </span>
            </span>
          </span>
          {logOutButton}
        </div>
      </div>
    </aside>
  );
}
