import Link from "next/link";
import Reveal from "./Reveal";
import PricingPlans from "./PricingPlans";

/** Pricing section on the landing page. The full page is /pricing. */
export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="text-center">
          <h2 className="mx-auto max-w-[18ch] text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            Start free. Upgrade when it pays for itself.
          </h2>
          <p className="mx-auto mt-5 max-w-[50ch] text-[17px] leading-relaxed text-mist">
            Try Nova on your own reviews for 7 days without a credit card,
            then pick the plan that fits your locations.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <PricingPlans />
        </Reveal>

        <p className="mt-12 text-center text-[15px] text-mist">
          Questions about plans?{" "}
          <Link
            href="/pricing#faq"
            className="text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            Read the pricing FAQ
          </Link>
        </p>
      </div>
    </section>
  );
}
