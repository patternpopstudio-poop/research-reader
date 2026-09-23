import { SiteMark } from "@/components/SiteMark";
import Link from "next/link";

const FOOTER_LINKS = [
  { href: "#help", label: "Help" },
  { href: "#terms", label: "Terms" },
  { href: "#privacy", label: "Privacy" },
] as const;

export function SiteFooter() {
  return (
    <footer id="help" className="mt-auto border-t border-[var(--line)] bg-white">
      <div className="flex w-full flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <SiteMark className="h-6 w-6 text-[var(--green)]" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-[var(--ink)]">Dr. Prathiba Reddy</span>
            <span className="text-[11px] text-[var(--ink-muted)]">Research for a healthier tomorrow</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-muted)]">
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-[var(--ink)]">
              {link.label}
            </a>
          ))}
          <span className="hidden h-4 w-px bg-[var(--line)] sm:block" aria-hidden="true" />
          <span>© 2026 Dr. Prathiba Reddy. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
