import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import {
  MIN_BILLABLE_CALL_SECONDS,
  TRIAL_CALLS,
  TRIAL_DAYS,
  dispatcherPlan,
} from "@/lib/dispatcher/plans";

export const metadata: Metadata = {
  title: "Terms of Service | NovaAI",
  description:
    "The terms for using NovaAI: the 14-day free trial, the Starter and Growth subscriptions, billing, cancellation, call recording and your responsibilities.",
};

const SUPPORT = "support@getnovaai.app";
const LAST_UPDATED = "November 23, 2026";

const link =
  "text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white";

const starter = dispatcherPlan("starter");
const growth = dispatcherPlan("growth");

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
              NovaAI answers phone calls for home service businesses with an
              AI dispatcher called Jessica. Calls you forward to your NovaAI
              number are answered by Jessica, who uses the information you
              give us (your services, prices, service area, hours and fees)
              to answer questions, take job requests and book visits. After
              each call we send you the job details, and keep a recording and
              a transcript of the call.
            </p>
            <p>
              Jessica is an AI system. She can misunderstand a caller or make
              mistakes, so check the job details you receive before you send
              a technician.
            </p>
          </Section>

          <Section id="trial" title="Free trial">
            <List>
              <li>
                Every new customer can try NovaAI free for {TRIAL_DAYS} days
                or {TRIAL_CALLS} answered calls, whichever comes first. No
                credit card is required.
              </li>
              <li>
                During the trial, Jessica answers the calls you forward to your
                NovaAI number.
              </li>
              <li>
                The trial never turns into a paid plan on its own. You are only
                charged if you choose one, which you can do at any time, also
                during the trial; your paid plan starts as soon as you pay. If you don&apos;t, we stop
                answering calls on your NovaAI number at the end of the trial.
              </li>
            </List>
          </Section>

          <Section id="plans" title="Paid plans">
            <p>NovaAI offers two subscriptions, billed in US dollars:</p>
            <List>
              <li>
                <strong className="font-medium text-fog">Starter:</strong> $
                {starter.price.monthly} per month billed monthly, or $
                {starter.price.annual} per month billed annually ($
                {(starter.price.annual * 12).toLocaleString("en-US")} per year).
                Up to {starter.calls} answered calls a month.
              </li>
              <li>
                <strong className="font-medium text-fog">Growth:</strong> $
                {growth.price.monthly} per month billed monthly, or $
                {growth.price.annual} per month billed annually ($
                {(growth.price.annual * 12).toLocaleString("en-US")} per year).
                Up to {growth.calls} answered calls a month.
              </li>
            </List>
            <p>
              An answered call is a call Jessica picks up that lasts longer
              than {MIN_BILLABLE_CALL_SECONDS} seconds. Hang-ups, wrong numbers
              and spam calls she ends quickly don&apos;t count.
            </p>
            <p>
              If you go over your plan&apos;s calls in a month, Jessica keeps
              answering. We will tell you, and if it happens two months in a
              row we will suggest the plan that fits. We never charge for
              extra calls without your agreement.
            </p>
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
                Give us accurate information about your business, and tell us
                when your prices, service area, hours or fees change.
              </li>
              <li>
                Calls are recorded, and Jessica tells callers that the call may
                be recorded. You are responsible for any further notice or
                consent the law requires where you operate.
              </li>
              <li>
                Only forward phone numbers you own or are authorized to use,
                and don&apos;t use NovaAI to make unsolicited calls.
              </li>
              <li>
                Jessica gives callers basic safety steps (for example, to leave
                the house and call 911 when they smell gas). She is not an
                emergency service, and you remain responsible for the work you
                agree to do.
              </li>
              <li>
                If you also use NovaAI&apos;s Google review replies, you are
                responsible for the replies published on your Business
                Profile, and should only connect locations you manage.
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
              We work to keep NovaAI available and accurate, but the service
              is provided as it is: calls can drop, and AI-generated answers,
              summaries and replies can contain mistakes. To the extent the law allows, NovaAI is not liable for
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
