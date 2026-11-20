import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | NovaAI",
  description:
    "What data NovaAI handles when it answers calls for your business or replies to your Google reviews, how it is used, and how to have it deleted.",
};

const CONTACT_EMAIL = "support@getnovaai.app";
const LAST_UPDATED = "November 21, 2026";
const GOOGLE_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";

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

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[46rem] px-5 pb-24 pt-36 md:px-8">
        <header className="rise">
          <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[1.03] tracking-[-0.035em]">
            Privacy Policy
          </h1>
          <p className="mt-5 text-[15px] text-mist">
            Last updated: {LAST_UPDATED}
          </p>
          <p className="mt-6 text-[17px] leading-relaxed text-mist">
            NovaAI answers phone calls for home service businesses with an AI
            dispatcher, and can also reply to their Google reviews. This
            policy explains what data we handle for each, what we do with it,
            and how you can have it deleted.
          </p>
        </header>

        <div
          className="rise mt-12 space-y-10 text-[16px] leading-relaxed text-mist"
          style={{ "--d": "0.12s" } as React.CSSProperties}
        >
          <Section id="calls" title="Phone calls we answer">
            <p>
              When a business forwards its calls to NovaAI, we process, on
              that business&apos;s behalf:
            </p>
            <List>
              <li>the caller&apos;s phone number and the time of the call;</li>
              <li>a recording and a transcript of the call;</li>
              <li>
                what the caller tells us, such as their name, service address,
                the problem and when they would like a visit.
              </li>
            </List>
            <p>
              We use this only to answer the call, pass the job details to
              the business and show them the recording and transcript. We do
              not sell it, use it for advertising, or contact callers for our
              own purposes. Callers who want their data deleted can ask the
              business or email us.
            </p>
            <p>
              For businesses that request a trial, we store the name, company,
              email, phone number and location given in the form, to set up
              the trial and contact them about it.
            </p>
          </Section>

          <Section id="data-we-access" title="Google data (review replies)">
            <p>
              NovaAI only accesses Google data after you sign in with Google
              and grant permission on Google&apos;s consent screen. With that
              permission we access:
            </p>
            <List>
              <li>
                <strong className="font-medium text-fog">
                  Google account information:
                </strong>{" "}
                your name, email address and profile picture, used to identify
                your NovaAI account.
              </li>
              <li>
                <strong className="font-medium text-fog">
                  Business Profile information:
                </strong>{" "}
                the Business Profile accounts and locations you manage,
                including each location&apos;s name and address.
              </li>
              <li>
                <strong className="font-medium text-fog">Reviews:</strong>{" "}
                the reviews left on those locations, including the
                reviewer&apos;s display name, star rating, review text and
                date, and any replies already posted.
              </li>
            </List>
            <p>
              Separately from Google, we store the information you give us
              directly: your account email, your business name, your tone of
              voice setting, your Autopilot setting and your alert email
              address.
            </p>
          </Section>

          <Section id="how-we-use-it" title="How we use it">
            <p>
              We use Google user data for one purpose: generating replies to
              your reviews and publishing them on your Business Profile.
              Specifically, we use it to:
            </p>
            <List>
              <li>show your reviews in your NovaAI dashboard;</li>
              <li>
                write a suggested reply to each review in the tone you chose;
              </li>
              <li>
                publish a reply to Google when you approve it, or
                automatically when you have turned on Autopilot;
              </li>
              <li>tell you when a reply is waiting for your approval.</li>
            </List>
            <p>We do not use Google user data for anything else. In particular:</p>
            <List>
              <li>
                We do not sell Google user data, or any other user data, to
                anyone.
              </li>
              <li>
                We do not use Google user data for advertising, including
                personalized or interest-based advertising.
              </li>
              <li>
                We do not use Google user data to develop, improve or train
                generalized artificial intelligence or machine learning
                models.
              </li>
              <li>
                We do not allow people to read your Google user data, unless
                you ask us to look at specific content to help you, it is
                needed for security purposes such as investigating abuse, or
                it is required by law.
              </li>
            </List>
          </Section>

          <Section id="limited-use" title="Google API Services: Limited Use">
            <p className="rounded-2xl border border-ice/25 bg-panel/70 p-5 text-fog">
              NovaAI&apos;s use and transfer to any other app of information
              received from Google APIs will adhere to{" "}
              <a
                href={GOOGLE_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section id="service-providers" title="Who processes data for us">
            <p>
              We share data only with the service providers needed to run the
              features described above, and only for that purpose:
            </p>
            <List>
              <li>
                <strong className="font-medium text-fog">Supabase</strong>{" "}
                hosts our database and sign-in system. Your account, settings,
                call details, reviews and replies are stored there.
              </li>
              <li>
                <strong className="font-medium text-fog">Retell AI</strong>{" "}
                runs Jessica&apos;s voice: it carries the call audio, produces
                the recording and transcript, and stores them for us.
              </li>
              <li>
                <strong className="font-medium text-fog">Telnyx</strong>{" "}
                provides the phone numbers and connects the calls.
              </li>
              <li>
                <strong className="font-medium text-fog">OpenAI</strong>{" "}
                provides the language model behind Jessica&apos;s answers and
                generates review reply text. To write a reply we send the review
                text, its star rating, the reviewer&apos;s display name, your
                business name and your tone of voice setting to the OpenAI
                API.
              </li>
              <li>
                <strong className="font-medium text-fog">Google</strong>{" "}
                receives the replies you approve, or that Autopilot publishes,
                so they appear on your Business Profile.
              </li>
            </List>
            <p>
              We do not transfer Google user data to any other third party,
              except where required by law.
            </p>
          </Section>

          <Section id="storage" title="Storage and security">
            <p>
              Data is sent over encrypted connections (HTTPS). Database access
              rules restrict each NovaAI account to its own data, so one
              customer cannot read another customer&apos;s reviews or
              settings. NovaAI uses a cookie to keep you signed in; we do not
              use advertising or tracking cookies.
            </p>
            <p>
              We keep your data for as long as your NovaAI account exists.
            </p>
          </Section>

          <Section id="deletion" title="Deleting your data">
            <p>
              To have your account and all associated data deleted, including
              reviews and replies stored by NovaAI, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                {CONTACT_EMAIL}
              </a>{" "}
              from the email address of your NovaAI account. We will delete
              your data within 30 days and confirm by email.
            </p>
            <p>
              You can also stop NovaAI&apos;s access to your Google account at
              any time from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                Google Account permissions
              </a>{" "}
              page. Replies already published on your Business Profile stay on
              Google until you delete them there.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              If we change how NovaAI uses your data, we will update this page
              and the date at the top. If a change affects how we use Google
              user data, we will ask for your consent before using your data
              in the new way.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              Questions about this policy or about your data:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                {CONTACT_EMAIL}
              </a>
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
