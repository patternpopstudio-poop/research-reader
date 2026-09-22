import { LoginForm } from "@/components/LoginForm";
import { PurchaseAccessForm } from "@/components/PurchaseAccessForm";
import { canReadPaper, getBillingSettings, getSessionUser, isAdmin } from "@/lib/access";
import {
  DEFAULT_CONTENTS,
  formatAccessPeriod,
  formatPrice,
  getPaperBySlug,
  publicCoverUrl,
} from "@/lib/papers";
import type { Paper } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  const price = formatPrice(billing);
  const period = formatAccessPeriod(billing);
  const cover = publicCoverUrl(paper.cover_path);
  const contents = (paper.contents ?? []).filter(Boolean);
  const included = contents.length > 0 ? contents : DEFAULT_CONTENTS;
  const denied = query.access === "none" || (Boolean(user) && !allowed);
  const readHref = `/papers/${paper.slug}/read`;

  let statusLabel = "Sign in or purchase";
  if (allowed) statusLabel = "Access active";
  else if (user) statusLabel = "No active access";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
        Research access
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)] lg:items-start">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-[var(--ink)] sm:text-5xl">{paper.title}</h1>
          {paper.subtitle ? (
            <p className="mt-3 text-lg text-[var(--ink-muted)]">{paper.subtitle}</p>
          ) : null}
          {paper.description ? (
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--ink-muted)]">{paper.description}</p>
          ) : (
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--ink-muted)]">
              Read this document in a secure viewer. There is no download, copy, or print. Access also
              includes future research from the practice for the subscription period.
            </p>
          )}
          <p className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-xs font-medium text-[var(--green)]">
            {statusLabel}
          </p>
          {denied ? (
            <p className="mt-4 max-w-xl text-sm text-red-800">
              No active access found{user?.email ? ` for ${user.email}` : ""}. Purchase access to read
              this research and future papers from the practice.
            </p>
          ) : null}
          {allowed ? (
            <div className="mt-8">
              <Link
                href={readHref}
                className="inline-flex rounded-full bg-[var(--green)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
              >
                Read research
              </Link>
            </div>
          ) : null}
          <h2 className="mt-10 font-serif text-2xl text-[var(--ink)]">What’s included</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--ink-muted)]">
            {included.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {(paper.highlights ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- cover host is the project's Supabase URL
            <img src={cover} alt="" className="h-auto w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/5] items-end bg-[linear-gradient(160deg,#d7e3d0,var(--paper)_55%)] p-6">
              <p className="font-serif text-2xl text-[var(--ink)]">{paper.title}</p>
            </div>
          )}
        </div>
      </div>

      {allowed ? null : (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {user ? null : (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
                Option A
              </p>
              <h2 className="mt-2 font-serif text-2xl">Already have access?</h2>
              <p className="mt-2 mb-6 text-sm leading-6 text-[var(--ink-muted)]">
                Enter the email used for your invitation or purchase. We will send a one-time sign-in
                link. If that address does not have access, you will not receive mail.
              </p>
              <LoginForm nextPath={readHref} submitLabel="Access Research" />
            </section>
          )}
          <section
            className={`rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 ${user ? "md:col-span-2" : ""}`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
              Option B
            </p>
            <h2 className="mt-2 font-serif text-2xl">Get access to this research</h2>
            <p className="mt-3 font-serif text-3xl text-[var(--ink)]">{price ?? "Price set by the practice"}</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{period}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
              {billing?.included_copy ||
                "This document and future research from the practice for the subscription period."}
            </p>
            <ul className="mt-4 space-y-1 text-sm text-[var(--ink-muted)]">
              <li>Secure in-browser reader</li>
              <li>No download, copy, or print</li>
              <li>Library access, not a one-off file</li>
            </ul>
            <PurchaseAccessForm slug={paper.slug} email={user?.email ?? undefined} />
          </section>
        </div>
      )}
    </div>
  );
}
