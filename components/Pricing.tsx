import Link from "next/link";
import Reveal from "./Reveal";

const included = [
  "1 Google Business Profile location",
  "Replies in the language the customer wrote in",
  "Auto-publish for 4 and 5 star reviews",
  "One-tap approval for 1 to 3 star reviews",
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto grid max-w-[1400px] items-end gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <Reveal>
          <h2 className="max-w-[14ch] text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            Free while you try it. No card.
          </h2>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-mist">
            Connect one location and let Nova answer your reviews. You never
            enter payment details to get started, so there is nothing to
            cancel if it isn&apos;t for you.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative overflow-hidden rounded-card border border-ice/25 bg-panel/80 p-7 md:p-10">
            <div
              aria-hidden="true"
              className="orb-rim pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30"
            />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[17px] font-medium">Free</p>
                <span className="rounded-full bg-ice/15 px-3 py-1 text-[13px] text-ice">
                  No credit card required
                </span>
              </div>
              <p className="mt-6 flex items-baseline gap-3">
                <span className="text-[clamp(4.5rem,10vw,7.5rem)] font-medium leading-none tracking-[-0.05em]">
                  $0
                </span>
                <span className="text-[15px] text-mist">per month</span>
              </p>
              <ul className="mt-8 space-y-3 border-t border-white/10 pt-6 text-[15px]">
                {included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-ice"
                    >
                      <path
                        d="m4 9.5 3.2 3.2L14 5.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-9 inline-block rounded-full bg-fog px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-white"
              >
                Start free
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
