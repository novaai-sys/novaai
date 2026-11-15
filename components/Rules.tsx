"use client";

import { useState } from "react";
import Reveal from "./Reveal";

type Rule = {
  id: string;
  stars: string;
  who: string;
  auto: boolean;
};

const initial: Rule[] = [
  { id: "high", stars: "4–5", who: "Happy customers", auto: true },
  { id: "mid", stars: "3", who: "Mixed feelings", auto: false },
  { id: "low", stars: "1–2", who: "Unhappy customers", auto: false },
];

export default function Rules() {
  const [rules, setRules] = useState(initial);

  const toggle = (id: string) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, auto: !r.auto } : r)));

  return (
    <section id="rules" className="scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="max-w-[40rem]">
          <h2 className="text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            You decide what goes out on its own.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-mist">
            A reply to an angry customer is public and carries your name. So by
            default Nova only publishes on its own when the review is good.
            Try the switches.
          </p>
        </Reveal>

        <ul className="mt-14 divide-y divide-white/10 border-y border-white/10">
          {rules.map((r, i) => (
            <Reveal
              as="li"
              key={r.id}
              delay={i * 0.1}
              className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-7 md:grid-cols-[14rem_1fr_auto] md:py-9"
            >
              <p className="flex items-baseline gap-2 text-[clamp(2.75rem,6vw,4.5rem)] font-medium leading-none tracking-[-0.04em]">
                {r.stars}
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-[0.42em] w-[0.42em] text-star"
                >
                  <path
                    fill="currentColor"
                    d="m10 1.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L10 1.5Z"
                  />
                </svg>
                <span className="sr-only">stars</span>
              </p>

              <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                <p className="text-[17px] font-medium">{r.who}</p>
                <p className="mt-1 text-[15px] text-mist" aria-live="polite">
                  {r.auto
                    ? "Nova publishes the reply right away."
                    : "Nova drafts the reply and emails it to you. One tap to approve."}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={r.auto}
                aria-label={`Publish replies to ${r.stars} star reviews without asking`}
                onClick={() => toggle(r.id)}
                className={`relative h-14 w-28 rounded-full border transition-colors duration-300 md:h-16 md:w-40 ${
                  r.auto
                    ? "border-ice/40 bg-gradient-to-r from-ice/10 via-lilac/25 to-ice/40"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-11 w-11 -translate-y-1/2 rounded-full transition-all duration-300 md:h-[3.25rem] md:w-[3.25rem] ${
                    r.auto
                      ? "left-[calc(100%-3.125rem)] bg-fog md:left-[calc(100%-3.625rem)]"
                      : "left-1.5 bg-ghost"
                  }`}
                />
              </button>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
