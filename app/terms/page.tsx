import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { plans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Terms of Service | NovaAI",
  description:
    "The terms for using Nova AI: the 7-day free trial, the Starter and Growth subscriptions, billing, cancellation and your responsibilities.",
};

const SUPPORT = "support@getnovaai.app";
const LAST_UPDATED = "November 17, 2026";

const link =
  "text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white";

const starter = plans.find((p) => p.id === "starter")!;
const growth = plans.find((p) => p.id === "growth")!;

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

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

const Mail = () => (
  <a href={`mailto:${SUPPORT}`} className={link}>
    {SUPPORT}
  </a>
);

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[46rem] px-5 pb-24 pt-36 md:px-8">
        <header className="rise">
          <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[1.03] tracking-[-0.035em]">
            Terms of Service
          </h1>
          <p className="mt-5 text-[15px] text-mist">
            Last updated: {LAST_UPDATED}
          </p>
          <p className="mt-6 text-[17px] leading-relaxed text-mist">
            These terms apply when you create a Nova AI account or use
            getnovaai.app. By creating an account, you agree to them. If you
            use Nova AI for a business, you confirm that you are allowed to
            accept these terms on its behalf.
          </p>
        </header>

        <div
          className="rise mt-12 space-y-10 text-[16px] leading-relaxed text-mist"
          style={{ "--d": "0.12s" } as React.CSSProperties}
        >
          <Section id="service" title="The service">
            <p>
              Nova AI writes suggested replies to the customer reviews of your
              business with artificial intelligence. You can read, edit and
              approve each reply in your dashboard, or turn on Autopilot to
              publish replies to 4 and 5-star reviews without asking you.
              Replies to 1 to 3-star reviews always wait for your approval.
            </p>
          </Section>

          <Section id="trial" title="Free trial">
            <List>
              <li>
                Every new account starts with a 7-day free trial. No credit
                card is required.
              </li>
              <li>
                The trial includes up to 10 AI-generated replies. It ends after
                7 days or after 10 replies, whichever comes first.
              </li>
              <li>
                When the trial ends, you can keep reading, editing and
                publishing the replies you already have. To generate new
                replies, choose a paid plan.
              </li>
              <li>
                The trial never turns into a paid plan on its own. You are only
                charged if you choose one.
              </li>
            </List>
          </Section>

          <Section id="plans" title="Paid plans">
            <p>Nova AI offers two subscriptions, billed in US dollars:</p>
            <List>
              <li>
                <strong className="font-medium text-fog">Starter:</strong> $
                {starter.price.monthly} per month billed monthly, or $
                {starter.price.annual} per month billed annually ($
                {starter.price.annual * 12} per year). 1 location and
                unlimited AI replies.
              </li>
              <li>
                <strong className="font-medium text-fog">Growth:</strong> $
                {growth.price.monthly} per month billed monthly, or $
                {growth.price.annual} per month billed annually ($
                {growth.price.annual * 12} per year). Up to 5 locations and
                unlimited AI replies.
              </li>
            </List>
            <p>
              The full list of what each plan includes is on the{" "}
              <Link href="/pricing" className={link}>
                Pricing
              </Link>{" "}
              page. Prices do not include taxes, which may be added at
              checkout depending on where you are.
            </p>
          </Section>

          <Section id="billing" title="Billing and renewal">
            <List>
              <li>
                Subscriptions are paid in advance, for one month or one year
                at a time.
              </li>
              <li>
                Each subscription renews automatically at the end of its
                period, at the same price, until you cancel.
              </li>
              <li>
                If we change the price of your plan, we will email you at least
                30 days before the new price applies to your next renewal.
              </li>
            </List>
          </Section>

          <Section id="cancellation" title="Cancellation">
            <p>
              You can cancel at any time from the Billing page in your
              dashboard (&ldquo;Manage subscription&rdquo; opens the Paddle
              customer portal), or by emailing <Mail /> from the email address
              of your Nova AI account.
            </p>
            <List>
              <li>There is no cancellation fee.</li>
              <li>
                Your plan stays active until the end of the period you have
                already paid for, and is not renewed after that.
              </li>
              <li>
                You can get a full refund within 14 days of your initial
                purchase. After that, no partial refunds are given for unused
                time. Details are in our{" "}
                <Link href="/refund" className={link}>
                  Refund Policy
                </Link>
                .
              </li>
            </List>
          </Section>

          <Section id="your-responsibilities" title="Your responsibilities">
            <List>
              <li>
                You are responsible for the replies published on your
                Business Profile, including those published by Autopilot.
                Read AI-generated replies before you approve them.
              </li>
              <li>
                Only connect Google Business Profile locations you own or are
                authorized to manage.
              </li>
              <li>
                Do not use Nova AI to publish misleading, abusive or unlawful
                content, or in a way that breaks Google&apos;s policies.
              </li>
              <li>Keep your login details private.</li>
            </List>
          </Section>

          <Section id="data" title="Your data">
            <p>
              How we collect, use and delete your data, including data from
              Google, is described in our{" "}
              <Link href="/privacy" className={link}>
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section id="ending" title="Ending your account">
            <p>
              You can ask us to delete your account at any time by emailing{" "}
              <Mail />. We may suspend an account that breaks these terms; if
              we do, we will tell you why by email.
            </p>
          </Section>

          <Section id="liability" title="Availability and liability">
            <p>
              We work to keep Nova AI available and accurate, but the service
              is provided as it is, and AI-generated replies can contain
              mistakes. To the extent the law allows, Nova AI is not liable for
              indirect losses arising from the use of the service, and our
              total liability is limited to the amount you paid us in the 12
              months before the claim.
            </p>
          </Section>

          <Section id="changes" title="Changes to these terms">
            <p>
              If we change these terms, we will update this page and the date
              at the top. For important changes, we will email you before they
              take effect.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              Questions about these terms, billing or your account:{" "}
              <Mail />
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
