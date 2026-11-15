import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 md:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 text-[13px] text-mist">
        <Logo className="text-fog" />
        <nav aria-label="Legal" className="flex gap-6">
          <Link href="/privacy" className="hover:text-fog">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fog">
            Terms
          </Link>
        </nav>
        <p>© 2026 NovaAI</p>
      </div>
    </footer>
  );
}
