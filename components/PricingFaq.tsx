const faqs = [
  {
    q: "How does Nova AI connect to my Google Business Profile?",
    a: "Through Google's official sign-in (Google OAuth). You approve access on Google's own consent screen, Nova AI never sees your Google password, and you can remove its access at any time from your Google Account permissions page.",
  },
  {
    q: "Can I edit AI responses before they are published?",
    a: "Yes. Every reply Nova writes appears in your dashboard, where you can read it, edit it and then publish it. Replies wait for your approval unless you turn on Autopilot, which publishes replies to 4 and 5-star reviews for you. Replies to 1 to 3-star reviews always wait for you.",
  },
  {
    q: "Does Nova AI support multiple languages?",
    a: "Yes. Nova writes each reply in the language the customer used, so a review in French gets a reply in French and a review in Arabic gets a reply in Arabic. There is nothing to set up.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Email support@getnovaai.app from your account email, or follow the steps on the Billing page in your dashboard. There is no cancellation fee, and your plan stays active until the end of the period you have already paid for.",
  },
];

/** Frequently asked questions as an accordion built on <details>. */
export default function PricingFaq() {
  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {faqs.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[17px] font-medium transition-colors hover:text-white md:text-[19px] [&::-webkit-details-marker]:hidden">
            {f.q}
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-mist transition-transform duration-300 group-open:rotate-45"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M6 1v10M1 6h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </summary>
          <p className="faq-answer max-w-[62ch] pb-7 pr-14 text-[16px] leading-relaxed text-mist">
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}
