import Reveal from "./Reveal";

const steps = [
  {
    title: "Keep your number",
    body: "Forward the calls you don't answer, or just nights and weekends, to your NovaAI line. Every carrier supports it, and you can switch it off any time.",
  },
  {
    title: "We set Jessica up for your shop",
    body: "Your services, prices, service area, hours and emergency fee. You tell us once; we have her answering within a day.",
  },
  {
    title: "Jobs land in your texts",
    body: "After every call you get the customer, address, problem and time window, plus the recording and transcript.",
  },
];

export default function Steps() {
  return (
    <section id="how" className="scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <h2 className="max-w-[16ch] text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            Live in a day. Nothing to install.
          </h2>
        </Reveal>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <Reveal
              as="li"
              key={s.title}
              delay={i * 0.12}
              className="border-t border-white/15 pt-6"
            >
              <span className="text-[15px] text-ice">{i + 1}</span>
              <h3 className="mt-8 max-w-[18ch] text-[22px] font-medium leading-snug tracking-[-0.01em]">
                {s.title}
              </h3>
              <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-mist">
                {s.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
