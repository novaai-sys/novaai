import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 md:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 text-[13px] text-mist">
        <Logo className="text-fog" />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/pricing" className="hover:text-fog">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-fog">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-fog">
            Terms of Service
          </Link>
          <Link href="/refund" className="hover:text-fog">
            Refund Policy
          </Link>
        </nav>
        <p>© 2026 NovaAI</p>
      </div>
    </footer>
  );
}
