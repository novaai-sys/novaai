import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Refund Policy | NovaAI",
  description:
    "Nova AI's refund policy: a 14-day money-back guarantee, how cancellations work, and how refunds are processed by Paddle.",
};

const SUPPORT = "support@getnovaai.app";
const LAST_UPDATED = "November 2026";

const link =
  "text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-white/10 pt-8">
      <h2
        id={id}
        className="text-[22px] font-medium leading-snug tracking-[-0.01em] text-fog"
      >
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

const Mail = () => (
  <a href={`mailto:${SUPPORT}`} className={link}>
    {SUPPORT}
  </a>
);

export default function RefundPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[46rem] px-5 pb-24 pt-36 md:px-8">
        <header className="rise">
          <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[1.03] tracking-[-0.035em]">
            Refund Policy
          </h1>
          <p className="mt-5 text-[15px] text-mist">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div
          className="rise mt-12 space-y-10 text-[16px] leading-relaxed text-mist"
          style={{ "--d": "0.12s" } as React.CSSProperties}
        >
          <Section id="overview" title="Overview">
            <p>Thank you for subscribing to Nova AI (getnovaai.app).</p>
          </Section>

          <Section id="money-back" title="14-day money-back guarantee">
            <p>
              We offer a full refund within 14 days of your initial purchase if
              you are not satisfied with our service.
            </p>
            <p>
              To request a refund, contact our support team at <Mail /> with
              your account email and order details.
            </p>
          </Section>

          <Section id="cancellations" title="Subscription cancellations">
            <p>
              You may cancel your monthly or annual subscription at any time
              from your account settings or through the Paddle customer portal.
            </p>
            <p>
              Upon cancellation, you will retain access to Nova AI until the end
              of your current billing period. No partial refunds are provided
              for unused time after the 14-day period.
            </p>
          </Section>

          <Section id="payment-processing" title="Payment processing">
            <p>
              All payments and refunds are processed securely by our Merchant
              of Record,{" "}
              <a
                href="https://www.paddle.com"
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                Paddle.com
              </a>
              . Approved refunds are credited back to your original payment
              method within 5–10 business days.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              Questions about refunds or billing: <Mail />
            </p>
            <p>
              See also our{" "}
              <Link href="/terms" className={link}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className={link}>
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <div className="border-t border-white/10 pt-10">
            <Link
              href="/"
              className="inline-block rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
