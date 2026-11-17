import Link from "next/link";
import HeroDuet from "./HeroDuet";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default function Hero() {
  return (
    <section className="relative px-5 pb-20 pt-32 md:px-8 md:pt-40">
      {/* Orb: outer div centres it, .orb drifts, rim turns, core breathes. */}
      <div
        aria-hidden="true"
        className="rise pointer-events-none absolute left-1/2 top-24 h-[340px] w-[340px] -translate-x-1/2 md:top-20 md:h-[520px] md:w-[520px]"
      >
        <div className="orb absolute inset-0">
          <div className="orb-rim absolute inset-0 rounded-full opacity-60" />
          <div className="orb-core absolute inset-3 rounded-full" />
        </div>
      </div>

      <div className="relative mx-auto max-w-[1400px]">
        <h1 className="text-center text-display font-medium">
          <span className="line-mask" style={d(0.15)}>
            <span>Every review answered.</span>
          </span>{" "}
          <span className="line-mask text-ghost" style={d(0.3)}>
            <span>While you run the shop.</span>
          </span>
        </h1>

        <p
          className="rise mx-auto mt-7 max-w-[46ch] text-balance text-center text-[17px] leading-relaxed text-mist"
          style={d(0.55)}
        >
          NovaAI watches your Google Business Profile and replies in your
          tone. Happy reviews go out on their own. Unhappy ones wait for you.
        </p>

        <div className="rise mt-9" style={d(0.7)}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white"
            >
              Start free
            </Link>
            <a
              href="#how"
              className="rounded-full border border-white/15 px-6 py-3 text-[15px] text-fog transition-colors hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-center text-[14px] text-mist">
            <span className="text-fog">7-day free trial.</span> No credit card
            required.
          </p>
        </div>

        <HeroDuet />
      </div>
    </section>
  );
}
