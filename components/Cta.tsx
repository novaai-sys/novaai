import Link from "next/link";
import Reveal from "./Reveal";

export default function Cta() {
  return (
    <section className="relative overflow-hidden px-5 py-28 md:px-8 md:py-44">
      <div
        aria-hidden="true"
        className="orb-rim pointer-events-none absolute left-1/2 top-full h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-35"
      />
      <Reveal className="relative mx-auto max-w-[1400px] text-center">
        <h2 className="text-display font-medium">
          Your next review is on its way.{" "}
          <span className="block text-ghost">Have the answer ready.</span>
        </h2>
        <Link
          href="/signup"
          className="mt-10 inline-block rounded-full bg-fog px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-white"
        >
          Start free
        </Link>
        <p className="mt-4 text-[14px] text-mist">
          <span className="text-fog">$0 to start (Early Access Beta).</span> No credit card
          required.
        </p>
      </Reveal>
    </section>
  );
}
