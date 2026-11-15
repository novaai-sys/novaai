import Link from "next/link";
import Logo from "./Logo";

const links = [
  { href: "/#rules", label: "Autopilot rules" },
  { href: "/#languages", label: "Languages" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
];

export default function Nav() {
  return (
    <header className="rise fixed inset-x-0 top-0 z-50 px-5 md:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="NovaAI home" className="text-fog">
            <Logo className="text-[15px]" />
          </Link>
          <nav
            aria-label="Main"
            className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl md:flex"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-1.5 text-[13px] text-mist transition-colors hover:bg-white/10 hover:text-fog"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-[13px] text-mist transition-colors hover:text-fog sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-fog px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
