"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav() {
  const pathname = usePathname();
  const active = pathname === "/" || pathname === "/papers";

  return (
    <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
      <Link
        href="/"
        aria-current={active ? "page" : undefined}
        className={`inline-flex h-16 items-center border-b-2 text-sm ${
          active
            ? "border-[var(--green)] font-medium text-[var(--ink)]"
            : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
        }`}
      >
        Research Library
      </Link>
    </nav>
  );
}
