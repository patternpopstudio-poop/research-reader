"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Research Library" },
  { href: "/#topics", label: "Topics" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
      {LINKS.map((link) => {
        const active = link.href === "/" && (pathname === "/" || pathname === "/papers");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-16 items-center border-b-2 text-sm ${
              active
                ? "border-[var(--green)] font-medium text-[var(--ink)]"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
