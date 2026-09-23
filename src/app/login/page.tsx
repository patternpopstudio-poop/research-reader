import { LibraryStory } from "@/components/LibraryStory";
import { LoginForm } from "@/components/LoginForm";
import { SiteMark } from "@/components/SiteMark";
import { getActiveGrant, getSessionUser, isAdmin, listAccessiblePapers } from "@/lib/access";
import { LIBRARY_PLAN } from "@/lib/plan";
import { isSupabaseConfigured, missingSupabaseEnvNames } from "@/lib/supabase/env.server";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";
  const user = await getSessionUser();

  let panel: ReactNode;
  if (user?.email) {
    const hasAccess = await signedInHasAccess(user.email);
    panel = hasAccess ? (
      <>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Welcome back</p>
        <h2 className="mt-3 font-serif text-4xl text-[var(--ink)]">Continue to your research</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Signed in as <strong className="text-[var(--ink)]">{user.email}</strong>.
        </p>
        <Link
          href={nextPath}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
        >
          Continue
          <span aria-hidden="true">→</span>
        </Link>
      </>
    ) : (
      <>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Research library</p>
        <h2 className="mt-3 font-serif text-4xl text-[var(--ink)]">No active access found</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">
          No active access found for {user.email}. Purchase access to read this research and future papers
          from the practice.
        </p>
        <Link
          href="/plans"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
        >
          View the {LIBRARY_PLAN.priceLabel} monthly plan
          <span aria-hidden="true">→</span>
        </Link>
      </>
    );
  } else {
    panel = (
      <>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Welcome back</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-[var(--ink)]">Sign in to your account</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Enter your email and password to open the research library.
        </p>
        {params.error ? (
          <p className="mt-4 text-sm text-red-800">The sign-in link was invalid or expired.</p>
        ) : null}
        {!isSupabaseConfigured() ? (
          <p className="mt-4 text-sm text-red-800">
            Supabase keys are missing ({missingSupabaseEnvNames().join(", ")}). Copy{" "}
            <code>.env.example</code> to <code>.env.local</code>, add your project URL and API keys, then
            restart <code>npm run dev</code>.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm variant="signin" nextPath={nextPath} submitLabel="Sign in" />
        </div>
        <p className="mt-3 text-center text-xs text-[var(--ink-muted)]">
          Use the email and password for your account. An invited address can set its password on the first sign-in.
        </p>
        <div className="my-6 flex items-center gap-3 text-xs tracking-[0.16em] text-[var(--ink-muted)]">
          <span className="h-px flex-1 bg-[var(--line)]" />
          OR
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                New to the practice?
              </p>
              <h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">Get access to our research library</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                One plan: {LIBRARY_PLAN.priceLabel} per month for the research library, including documents published while you are subscribed.
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--green)_12%,var(--paper))] text-[var(--green)]">
              <CartIcon />
            </span>
          </div>
          <Link
            href="/plans"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--green)] px-5 py-3 text-sm font-medium text-[var(--green)] transition hover:bg-[var(--green)] hover:text-white"
          >
            View access plans
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        <section className="relative order-2 flex flex-col overflow-hidden bg-[linear-gradient(165deg,#e3ecdf,var(--cream)_46%,var(--paper))] px-8 py-10 lg:order-1 lg:px-12 lg:py-12">
          <div
            className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--green)_16%,transparent)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-24 -left-24 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--green)_10%,transparent)]"
            aria-hidden="true"
          />
          <LibraryStory showMark pinnedQuote />
        </section>
        <section className="order-1 flex flex-col bg-[var(--paper)] px-6 py-6 sm:px-10 lg:order-2 lg:px-14 lg:py-8">
          <div className="flex justify-end">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <span aria-hidden="true">←</span>
              Back to Home
            </Link>
          </div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{panel}</div>
          <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-3 pb-6 text-center">
            <TrustNote icon={<LockIcon />} title="Secure login" detail="Your data is protected" />
            <TrustNote icon={<ReaderIcon />} title="Read anywhere" detail="In the browser" />
            <TrustNote icon={<PeopleMark />} title="From the practice" detail="Clinical guides" />
          </div>
          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-2">
              <SiteMark className="h-6 w-6 text-[var(--green)]" />
              <span className="font-serif text-[var(--ink)]">Dr. Prathiba Reddy</span>
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <a href="#help" className="hover:text-[var(--ink)]">
                Help
              </a>
              <a href="#privacy" className="hover:text-[var(--ink)]">
                Privacy
              </a>
              <a href="#terms" className="hover:text-[var(--ink)]">
                Terms
              </a>
              <span>© 2026 Dr. Prathiba Reddy</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

async function signedInHasAccess(email: string) {
  if (await isAdmin()) return true;
  if (await getActiveGrant(email)) return true;
  const papers = await listAccessiblePapers();
  return papers.length > 0;
}

function TrustNote({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--green)]">
        {icon}
      </span>
      <span className="text-xs font-medium text-[var(--ink)]">{title}</span>
      <span className="text-xs leading-4 text-[var(--ink-muted)]">{detail}</span>
    </div>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h15l-1.5 9h-12L5 7z" />
      <path d="M8 7l1-3h6l1 3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}

function ReaderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function PeopleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4.5 18.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4" />
    </svg>
  );
}
