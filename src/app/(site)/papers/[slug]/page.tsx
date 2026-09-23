import { LoginForm } from "@/components/LoginForm";
import { PdfCover } from "@/components/PdfCover";
import { PurchaseAccessForm } from "@/components/PurchaseAccessForm";
import { canReadPaper, getBillingSettings, getSessionUser, isAdmin } from "@/lib/access";
import { formatPublishedMonth, getPaperPresentation, paperTopic } from "@/lib/paper-presentation";
import { LIBRARY_PLAN } from "@/lib/plan";
import {
  DEFAULT_CONTENTS,
  getPaperBySlug,
  publicCoverUrl,
} from "@/lib/papers";
import type { Paper } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ access?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  if (!paper) return { title: "Research" };
  return {
    title: paper.title,
    description: paper.description || paper.subtitle || undefined,
  };
}

export default async function PaperPortalPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const paper = await getPaperBySlug(slug);
  if (!paper) notFound();

  const adminUser = await isAdmin();
  if (!paper.published && !adminUser) notFound();

  const user = await getSessionUser();
  const allowed = user?.email ? await canReadPaper(paper as Paper, user.email) : false;
  const billing = await getBillingSettings();
  const cover = publicCoverUrl(paper.cover_path);
  const contents = (paper.contents ?? []).filter(Boolean);
  const checklist = [...(contents.length > 0 ? contents : DEFAULT_CONTENTS), ...(paper.highlights ?? [])];
  const denied = !allowed && (query.access === "none" || Boolean(user));
  const readHref = `/papers/${paper.slug}/read`;
  const presentation = getPaperPresentation(paper.slug);
  const published = formatPublishedMonth(presentation?.publishedOn ?? paper.created_at);
  const description =
    paper.description ||
    "Read this document in a secure viewer. There is no download, copy, or print. Access also includes future research from the practice for the subscription period.";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <span aria-hidden="true">←</span>
        Back to Research Library
      </Link>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,24rem)] lg:gap-10">
        <article>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- cover host is the project's Supabase URL
            <img src={cover} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover" />
          ) : (
            <PdfCover className="rounded-2xl" />
          )}

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
            {paperTopic(paper.slug)}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--ink)] sm:text-5xl">{paper.title}</h1>
          {paper.subtitle ? <p className="mt-2 text-lg text-[var(--ink)]">{paper.subtitle}</p> : null}
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--ink-muted)]">{description}</p>

          <ul className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
            {presentation?.pages ? (
              <MetaChip icon={<PagesIcon />} title={`${presentation.pages} pages`} detail="Research guide" />
            ) : null}
            {published ? (
              <MetaChip icon={<CalendarIcon />} title="Published" detail={published} />
            ) : null}
            <MetaChip icon={<PeopleIcon />} title="Peer-reviewed" detail="by clinical experts" />
          </ul>
          {presentation?.quote ? (
            <blockquote className="mt-8 max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-5 py-4">
              <p className="font-serif text-lg leading-7 text-[var(--ink)]">“{presentation.quote}”</p>
              {presentation.quoteBy ? (
                <footer className="mt-3 text-sm text-[var(--ink-muted)]">— {presentation.quoteBy}</footer>
              ) : null}
            </blockquote>
          ) : null}
        </article>

        <aside className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 lg:sticky lg:top-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Access research
          </p>
          {allowed ? (
            <>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)]">Read this research</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                Your access is active. Open the secure viewer to continue.
              </p>
              <Link
                href={readHref}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
              >
                Read research
                <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)]">
                Get access to this research
              </h2>
              {user ? (
                <Link
                  href={readHref}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--green)] px-5 py-3 text-sm font-medium text-[var(--green)] transition hover:bg-[var(--green)] hover:text-white"
                >
                  Read free preview
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
              {denied ? (
                <p className="mt-3 text-sm leading-6 text-red-800">
                  No active subscription found{user?.email ? ` for ${user.email}` : ""}. Free access includes the
                  first 2 pages of 3 documents.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  Choose an option below to continue.
                </p>
              )}

              {user ? null : (
                <section className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--green)_28%,var(--line))] bg-[color-mix(in_srgb,var(--green)_10%,var(--paper))] p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-white">
                      <MailIcon />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg text-[var(--ink)]">Existing user</h3>
                      <p className="text-sm font-medium text-[var(--ink)]">Already purchased or subscribed?</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                        Sign in with your email and password.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <LoginForm variant="access" nextPath={readHref} submitLabel="Access Research" />
                  </div>
                  <p className="mt-3 text-center text-xs text-[var(--ink-muted)]">
                    First sign-in sets the password for an invited address.
                  </p>
                </section>
              )}

              <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--green)]">
                    <CartIcon />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg text-[var(--ink)]">New user</h3>
                    <p className="text-sm font-medium text-[var(--ink)]">Get access to this research</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                      {billing?.included_copy ||
                        "The monthly library subscription includes this document and future research from the practice."}
                    </p>
                  </div>
                </div>
                <p className="mt-4 font-serif text-4xl text-[var(--ink)]">
                  {LIBRARY_PLAN.priceLabel}
                  <span className="ml-2 font-sans text-base font-medium text-[var(--ink-muted)]">
                    {LIBRARY_PLAN.cadenceLabel}
                  </span>
                </p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  Billed monthly.{" "}
                  <Link href="/plans" className="text-[var(--green)] hover:underline">
                    See what the subscription includes
                  </Link>
                </p>
                <ul className="mt-4 space-y-2">
                  {checklist.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-6 text-[var(--ink-muted)]">
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <PurchaseAccessForm variant="access" slug={paper.slug} email={user?.email ?? undefined} />
                </div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--ink-muted)]">
                  <LockIcon />
                  Secure payment powered by Stripe
                </p>
              </section>
            </>
          )}
        </aside>
      </div>

      <ul className="mt-12 grid grid-cols-2 gap-6 border-t border-[var(--line)] pt-8 sm:grid-cols-4">
        <TrustItem icon={<BookIcon />} label="Evidence-based research" />
        <TrustItem icon={<ShieldIcon />} label="Trusted by clinicians" />
        <TrustItem icon={<EyeIcon />} label="Secure read-only access" />
        <TrustItem icon={<LockIcon />} label="Protected content" />
      </ul>
    </div>
  );
}

function MetaChip({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--green)]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium text-[var(--ink)]">{title}</span>
        <span className="block text-xs text-[var(--ink-muted)]">{detail}</span>
      </span>
    </li>
  );
}

function TrustItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <li className="flex flex-col items-center gap-3 text-center text-sm text-[var(--ink-muted)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--green)]">
        {icon}
      </span>
      {label}
    </li>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h15l-1.5 9h-12L5 7z" />
      <path d="M8 7l1-3h6l1 3" />
      <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-[var(--green)]" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7.5" />
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

function PagesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14 3.5V8h4.5M8 12h8M8 16h6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4.5 18.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4" />
      <path d="M13.5 14.6c1.4-.4 2.6-.2 3.6.6 1 .8 1.6 2 1.9 3.3" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5z" />
      <path d="M5 19.2A2.5 2.5 0 0 1 7.5 17H19" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.5l7 2.5v6.2c0 4.2-2.8 7.2-7 8.3-4.2-1.1-7-4.1-7-8.3V6l7-2.5z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
