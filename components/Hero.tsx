import JobText from "./JobText";
import TalkToJessica from "./TalkToJessica";
import { TRIAL_DAYS } from "@/lib/dispatcher/plans";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default function Hero() {
  return (
    <section className="relative overflow-x-clip px-5 pb-20 pt-32 md:px-8 md:pt-40">
      {/* Orb: outer div centres it, .orb drifts, rim turns, core breathes. */}
      <div
        aria-hidden="true"
        className="rise pointer-events-none absolute left-1/2 top-24 h-[340px] w-[340px] -translate-x-1/2 md:top-20 md:h-[520px] md:w-[520px]"
      >
        <div className="orb absolute inset-0">
          <div className="orb-rim absolute inset-0 rounded-full opacity-60" />
          <div className="orb-core absolute inset-3 rounded-full" />
        </div>
      </div>

      <div className="relative mx-auto max-w-[1400px]">
        <p
          className="rise text-center text-[15px] text-ice"
          style={d(0.05)}
        >
          AI dispatcher for HVAC and plumbing shops
        </p>
        <h1 className="mt-5 text-center text-display font-medium">
          <span className="line-mask" style={d(0.15)}>
            <span>Every call answered.</span>
          </span>{" "}
          <span className="line-mask text-ghost" style={d(0.3)}>
            <span>Even from under a sink.</span>
          </span>
        </h1>

        <p
          className="rise mx-auto mt-7 max-w-[50ch] text-balance text-center text-[17px] leading-relaxed text-mist"
          style={d(0.55)}
        >
          Jessica picks up the calls you can&apos;t, day or night. She books
          the job, handles emergencies safely and texts you the details, so
          the homeowner doesn&apos;t call the next company on Google.
        </p>

        <div className="rise mt-9" style={d(0.7)}>
          <TalkToJessica />
          <p className="mt-5 text-center text-[14px] text-mist">
            or{" "}
            <a
              href="#trial"
              className="text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white"
            >
              start a {TRIAL_DAYS}-day free trial
            </a>
            . We set it up for you. No credit card.
          </p>
        </div>

        <JobText />
      </div>
    </section>
  );
}
