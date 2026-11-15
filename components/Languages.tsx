import Reveal from "./Reveal";

const cards = [
  {
    lang: "Deutsch",
    text: "Danke, Jonas! Schön, dass die Reparatur so schnell geklappt hat. Bis zum nächsten Mal.",
    tilt: "md:-rotate-[12deg] md:translate-y-12",
  },
  {
    lang: "Français",
    text: "Merci Camille ! Ravis que la terrasse vous ait plu. À très bientôt.",
    tilt: "md:-rotate-[6deg] md:translate-y-3",
  },
  {
    lang: "English",
    text: "Thanks, Priya! Glad the fitting went smoothly. See you at the next one.",
    tilt: "md:z-10",
  },
  {
    lang: "العربية",
    text: "شكراً لك يا أمين! سعداء أن القهوة أعجبتك، وننتظر زيارتك القادمة.",
    tilt: "md:rotate-[6deg] md:translate-y-3",
    rtl: true,
  },
  {
    lang: "Español",
    text: "¡Gracias, Lucía! Nos alegra que el corte te haya encantado. Te esperamos pronto.",
    tilt: "md:rotate-[12deg] md:translate-y-12",
  },
];

export default function Languages() {
  return (
    <section
      id="languages"
      className="scroll-mt-24 overflow-hidden px-5 py-24 md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
        <h2 className="mx-auto max-w-[18ch] text-center text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
          Answers in the language the customer wrote in.
        </h2>
        </Reveal>

        <ul className="mt-14 flex snap-x gap-4 overflow-x-auto pb-6 md:mt-20 md:justify-center md:gap-0 md:overflow-visible md:pb-16">
          {cards.map((c, i) => (
            <Reveal
              as="li"
              key={c.lang}
              delay={0.1 + Math.abs(i - 2) * 0.12}
              className={`w-60 shrink-0 snap-center rounded-card border border-white/10 bg-panel p-6 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] md:-mx-1 md:w-48 lg:w-60 ${c.tilt}`}
            >
              <p className="text-[13px] text-mist">{c.lang}</p>
              <p
                dir={c.rtl ? "rtl" : undefined}
                lang={c.rtl ? "ar" : undefined}
                className="mt-10 text-[16px] leading-relaxed text-fog"
              >
                {c.text}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
