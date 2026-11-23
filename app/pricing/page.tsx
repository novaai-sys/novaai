import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PricingPlans from "@/components/PricingPlans";
import PricingFaq from "@/components/PricingFaq";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Pricing | NovaAI",
  description:
    "NovaAI dispatcher plans: a 14-day free trial, Starter at $249 a month for 150 calls and Growth at $449 a month for 300 calls. Save 20% with annual billing.",
};

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden px-5 pb-24 pt-36 md:px-8 md:pb-32 md:pt-44">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2"
          >
            <div className="orb absolute inset-0">
              <div className="orb-rim absolute inset-0 rounded-full opacity-35" />
              <div className="orb-core absolute inset-3 rounded-full" />
            </div>
          </div>

          <div className="relative mx-auto max-w-[1200px]">
            <h1 className="text-center text-display font-medium">
              <span className="line-mask" style={d(0.1)}>
                <span>Simple pricing.</span>
              </span>{" "}
              <span className="line-mask text-ghost" style={d(0.25)}>
                <span>Every call answered.</span>
              </span>
            </h1>
            <p
              className="rise mx-auto mt-7 max-w-[48ch] text-balance text-center text-[17px] leading-relaxed text-mist"
              style={d(0.45)}
            >
              Start with a 14-day free trial on your real calls, no credit
              card required. Then pay monthly, or annually and save 20%.
            </p>

            <div className="rise mt-14" style={d(0.6)}>
              <PricingPlans />
            </div>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-24 px-5 pb-28 md:px-8 md:pb-40"
        >
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <Reveal>
              <h2
                id="faq-title"
                className="max-w-[12ch] text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]"
              >
                Questions, answered.
              </h2>
              <p className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-mist">
                Something else on your mind? Write to{" "}
                <a
                  href="mailto:support@getnovaai.app"
                  className="text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white"
                >
                  support@getnovaai.app
                </a>
                .
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <PricingFaq />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-white/10 px-5 py-20 md:px-8 md:py-28">
          <Reveal className="mx-auto max-w-[1200px] text-center">
            <h2 className="mx-auto max-w-[20ch] text-[clamp(1.75rem,3.4vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">
              See Nova answer your own reviews this week.
            </h2>
            <Link
              href="/signup?plan=free"
              className="mt-9 inline-block rounded-full bg-fog px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-white"
            >
              Start Free Trial
            </Link>
            <p className="mt-4 text-[14px] text-mist">
              7 days free. No credit card required.
            </p>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
