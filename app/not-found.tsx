import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div className="rise">
        <Logo className="text-[15px]" />
        <h1 className="mt-8 text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
          This page doesn&apos;t exist.
        </h1>
        <p className="mt-4 text-[17px] text-mist">
          The link may be old, or the address may have a typo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white"
          >
            Go to the home page
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/15 px-6 py-3 text-[15px] text-fog transition-colors hover:bg-white/5"
          >
            Open the dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
