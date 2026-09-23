import { SiteMark } from "@/components/SiteMark";
import { SiteNav } from "@/components/SiteNav";
import { isAdmin } from "@/lib/access";
import { tryCreateClient } from "@/lib/supabase/server";
import Link from "next/link";

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const letters = local.replace(/[^a-zA-Z0-9]/g, "");
  return (letters.slice(0, 2) || "RR").toUpperCase();
}

function greetingName(email: string) {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]+/).filter(Boolean)[0] ?? "";
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export async function SiteHeader() {
  let email: string | null = null;
  let admin = false;
  try {
    const supabase = await tryCreateClient();
    if (!supabase) throw new Error("supabase unconfigured");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    try {
      if (user) admin = await isAdmin();
    } catch {
      admin = false;
    }
  } catch {
    email = null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white">
      <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <SiteMark className="h-8 w-8 shrink-0 text-[var(--green)]" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-[var(--ink)]">Dr. Prathiba Reddy</span>
            <span className="truncate text-[11px] text-[var(--ink-muted)]">Research for a healthier tomorrow</span>
          </span>
        </Link>
        <SiteNav />
        <div className="flex items-center justify-end">
          {email ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pr-1 [&::-webkit-details-marker]:hidden">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--green)] text-xs font-medium tracking-wide text-white"
                  aria-hidden="true"
                >
                  {initialsFromEmail(email)}
                </span>
                <span className="hidden text-sm text-[var(--ink)] sm:inline">
                  Hi, {greetingName(email)}
                </span>
                <ChevronIcon />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-[var(--line)] bg-white p-1 shadow-lg">
                {admin ? (
                  <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--cream)]">
                    Admin
                  </Link>
                ) : null}
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--cream)]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="hidden h-4 w-4 text-[var(--ink-muted)] transition group-open:rotate-180 sm:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}
