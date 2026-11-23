const faqs = [
  {
    q: "Do I need a new phone number?",
    a: "No. You keep the number on your trucks, website and Google listing. You forward the calls you don't answer, or only nights and weekends, to your NovaAI line. Every US carrier supports this, and you can turn it off at any time.",
  },
  {
    q: "Will callers know they're talking to an AI?",
    a: "Jessica sounds like a friendly, experienced dispatcher, and most callers just give her their details. If someone asks whether she's a real person, she tells them honestly that she's your AI assistant and offers to have you call back. Callers are told the call may be recorded.",
  },
  {
    q: "What does Jessica do in an emergency?",
    a: "Safety comes first. For a gas smell, a carbon monoxide alarm or sparks, she tells the caller to get out and call 911 or the gas company. For flooding, she walks them to the main water shut-off. Then she books the earliest emergency visit and texts you straight away. On Growth she can also transfer the call to your on-call phone.",
  },
  {
    q: "Does she quote prices?",
    a: "Only the prices you give us, such as your service call fee, tune-up price or after-hours fee. She never guesses the price of a repair or a new system: she books the visit or your free estimate instead.",
  },
  {
    q: "Does it work with ServiceTitan, Jobber or Housecall Pro?",
    a: "Today Jessica texts you the job details and keeps every recording and transcript, so you can add the job to any software in seconds. Booking straight into your software is on the way; tell us what you use when you start your trial.",
  },
  {
    q: "What counts as a call, and what if I go over?",
    a: "A call counts when Jessica picks up and it lasts longer than 20 seconds, so hang-ups, wrong numbers and spam don't use up your plan. If you go over, she keeps answering: we let you know, and if it happens two months in a row we suggest the plan that fits. We never charge for extra calls without asking.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. The free trial needs no credit card and never turns into a paid plan by itself. Paid plans are month to month or yearly, with no cancellation fee. Email support@getnovaai.app and we stop forwarding the same day.",
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
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
