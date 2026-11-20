import Reveal from "./Reveal";

type Case = { caller: string; outcome: string; does: string };

/** Real situations from HVAC and plumbing calls, and what Jessica does. */
const cases: Case[] = [
  {
    caller: "“My AC quit and it’s 98 degrees in here.”",
    outcome: "Booked today",
    does: "Asks who’s at home, treats it as urgent, offers today’s first open window and texts you the job.",
  },
  {
    caller: "“I smell gas in the kitchen.”",
    outcome: "Safety first",
    does: "Tells them to get out and call 911 or the gas company from outside. Then books the visit.",
  },
  {
    caller: "“Water is coming through the ceiling.”",
    outcome: "Emergency visit",
    does: "Walks them to the main shut-off valve, explains your after-hours fee and books the emergency call.",
  },
  {
    caller: "“How much for a new water heater?”",
    outcome: "Estimate booked",
    does: "Never guesses a price. Offers your free in-home estimate and books it.",
  },
  {
    caller: "“Hi, I’m calling about your Google listing…”",
    outcome: "Filtered",
    does: "Spots sales and spam calls, says no thanks and hangs up. You never hear about it.",
  },
];

export default function Handles() {
  return (
    <section id="calls" className="scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="max-w-[44rem]">
          <h2 className="text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            She knows a gas leak from a dripping tap.
          </h2>
          <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-mist">
            Jessica is trained on the calls a home service shop really gets,
            and on your prices, service area and hours. Here&apos;s what she
            does with five of them.
          </p>
        </Reveal>

        <ul className="mt-14 divide-y divide-white/10 border-y border-white/10">
          {cases.map((c, i) => (
            <Reveal
              as="li"
              key={c.caller}
              delay={i * 0.08}
              className="grid gap-x-10 gap-y-3 py-7 md:grid-cols-[minmax(0,1.1fr)_9rem_minmax(0,1fr)] md:items-baseline md:py-9"
            >
              <p className="text-[clamp(1.35rem,2.4vw,1.9rem)] font-medium leading-snug tracking-[-0.02em]">
                {c.caller}
              </p>
              <p className="text-[15px] text-ice">{c.outcome}</p>
              <p className="max-w-[46ch] text-[15px] leading-relaxed text-mist">
                {c.does}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
