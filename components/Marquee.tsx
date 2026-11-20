const line = "Calls in. Jobs booked. ";

export default function Marquee() {
  return (
    <section
      aria-label="Calls in. Jobs booked."
      className="relative overflow-hidden border-y border-white/10 py-16 md:py-24"
    >
      <div
        aria-hidden="true"
        className="beam absolute left-0 top-1/2 h-px w-full opacity-70"
      />
      <div
        aria-hidden="true"
        className="beam absolute left-0 top-1/2 h-24 w-full -translate-y-1/2 opacity-10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="marquee-track relative flex w-max whitespace-nowrap text-[clamp(4rem,13vw,11rem)] font-medium leading-none tracking-[-0.04em]"
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="pr-[0.4em]">
            <span className="text-ghost/60">Calls in.</span>{" "}
            <span className="text-fog">Jobs booked.</span>
          </span>
        ))}
      </div>
      <span className="sr-only">{line}</span>
    </section>
  );
}
