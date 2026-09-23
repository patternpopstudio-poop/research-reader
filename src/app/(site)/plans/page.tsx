import { PurchaseAccessForm } from "@/components/PurchaseAccessForm";
import { getActiveGrant, getSessionUser, isAdmin } from "@/lib/access";
import { LIBRARY_PLAN } from "@/lib/plan";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access plans",
  description: `A ${LIBRARY_PLAN.priceLabel} monthly subscription for the research library.`,
};

export default async function PlansPage() {
  const user = await getSessionUser();
  const hasAccess = user?.email ? await readerHasAccess(user.email) : false;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-8 lg:py-16">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <span aria-hidden="true">←</span>
        Back to sign in
      </Link>

      <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Access plans</p>
      <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
        One plan, {LIBRARY_PLAN.priceLabel} a month
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ink-muted)]">{LIBRARY_PLAN.summary}</p>

      <article className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              {LIBRARY_PLAN.name}
            </p>
            <p className="mt-2 font-serif text-5xl text-[var(--ink)]">
              {LIBRARY_PLAN.priceLabel}
              <span className="ml-2 font-sans text-base font-medium text-[var(--ink-muted)]">
                {LIBRARY_PLAN.cadenceLabel}
              </span>
            </p>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[var(--ink-muted)]">
            Billed monthly through Stripe. This is the only plan.
          </p>
        </div>

        <h2 className="mt-8 font-serif text-2xl text-[var(--ink)]">What the subscription includes</h2>
        <ul className="mt-4 space-y-4">
          {LIBRARY_PLAN.includes.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <CheckIcon />
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">{item.title}</span>
                <span className="mt-0.5 block text-sm leading-6 text-[var(--ink-muted)]">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-[var(--line)] pt-6">
          {hasAccess ? (
            <>
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                Signed in as <strong className="text-[var(--ink)]">{user?.email}</strong>. Your access is already
                active.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] sm:w-auto"
              >
                Open the library
                <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--ink)]">Subscribe</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                Enter the email that should receive the library. After payment, a sign-in link goes to that address.
              </p>
              <div className="mt-4">
                <PurchaseAccessForm
                  variant="access"
                  email={user?.email ?? undefined}
                  submitLabel={`Subscribe for ${LIBRARY_PLAN.priceLabel} / month`}
                />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                <LockIcon />
                Secure payment powered by Stripe
              </p>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

async function readerHasAccess(email: string) {
  if (await isAdmin()) return true;
  return Boolean(await getActiveGrant(email));
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-5 w-5 shrink-0 text-[var(--green)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.2 4.2L19 7.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}
