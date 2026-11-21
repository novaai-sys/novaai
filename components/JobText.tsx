/**
 * The text an owner gets after Jessica books a job. Shown under the hero.
 */
const rows: [string, string][] = [
  ["Customer", "Linda Morales"],
  ["Callback", "(512) 555-0148"],
  ["Address", "1904 Oak Hollow Dr, Round Rock 78664"],
  ["Issue", "AC running, blowing warm air. Unit about 9 years old."],
  ["Urgency", "Today. Elderly mother at home."],
  ["Window", "Today 12–5"],
];

export default function JobText() {
  return (
    <figure
      className="rise relative mx-auto mt-20 w-full max-w-[30rem] md:mt-24"
      style={{ "--d": "0.9s" } as React.CSSProperties}
    >
      <div className="rounded-[28px] border border-white/10 bg-panel/80 p-5 shadow-[0_40px_120px_-40px_rgba(169,200,255,0.35)] backdrop-blur md:p-6">
        <div className="flex items-center justify-between gap-4 text-[13px] text-mist">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#7fe0a8]" aria-hidden="true" />
            Text from NovaAI
          </span>
          <time>9:47 PM</time>
        </div>
        <p className="mt-4 text-[19px] font-medium leading-snug">
          New job booked by Jessica
        </p>
        <dl className="mt-4 divide-y divide-white/10 border-t border-white/10 text-[14px]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
              <dt className="text-mist">{k}</dt>
              <dd className="text-fog">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[13px] text-mist">
          Call recording and transcript in your dashboard.
        </p>
      </div>
      <figcaption className="mt-4 text-center text-[13px] text-ghost">
        What you get after every call Jessica answers.
      </figcaption>
    </figure>
  );
}
