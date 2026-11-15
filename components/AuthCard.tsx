"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { createClient } from "@/lib/supabase/client";

const field =
  "mt-2 w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60";

/** Email and password sign-up / log-in with Supabase Auth. */
export default function AuthCard({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const signup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const credentials = { email: email.trim(), password };

      if (signup) {
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) throw error;
        if (!data.session) {
          // The project requires email confirmation before the first login.
          setNotice(
            "Account created. Open the confirmation link we sent to your email, then log in.",
          );
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="orb absolute inset-0">
          <div className="orb-rim absolute inset-0 rounded-full opacity-40" />
          <div className="orb-core absolute inset-3 rounded-full" />
        </div>
      </div>

      <div className="rise relative w-full max-w-[26rem] rounded-card border border-white/10 bg-panel/80 p-7 backdrop-blur-xl md:p-9">
        <Link href="/" aria-label="NovaAI home">
          <Logo className="text-[15px]" />
        </Link>
        <h1 className="mt-8 text-[30px] font-medium leading-tight tracking-[-0.03em]">
          {signup ? "Start free" : "Log in"}
        </h1>
        <p className="mt-2 text-[15px] text-mist">
          {signup
            ? "$0 to start. No credit card required."
            : "Welcome back. Your reviews are waiting."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="text-[14px] font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourshop.com"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-[14px] font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={signup ? "At least 6 characters" : "Your password"}
              className={field}
            />
          </div>

          {error && (
            <p role="alert" className="text-[14px] leading-relaxed text-star">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-[14px] leading-relaxed text-ice">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white disabled:opacity-50"
          >
            {busy
              ? signup
                ? "Creating your account…"
                : "Logging in…"
              : signup
                ? "Create free account"
                : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-[14px] text-mist">
          {signup ? "Already have an account? " : "New to NovaAI? "}
          <Link
            href={signup ? "/login" : "/signup"}
            className="text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            {signup ? "Log in" : "Start free"}
          </Link>
        </p>
      </div>
    </main>
  );
}
