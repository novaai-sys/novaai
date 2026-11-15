import Reveal from "./Reveal";

const steps = [
  {
    title: "Connect your Google Business Profile",
    body: "Sign in with Google and pick the locations Nova should look after. You can disconnect at any time.",
  },
  {
    title: "Tell Nova how you speak",
    body: "Warm, formal, short, funny. Add what makes your shop yours, and what Nova should never promise.",
  },
  {
    title: "Reviews get answered",
    body: "Nova checks for new reviews around the clock, replies to the good ones, and brings you the rest.",
  },
];

export default function Steps() {
  return (
    <section id="how" className="scroll-mt-24 px-5 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <h2 className="max-w-[16ch] text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            Set up once, in about five minutes.
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
