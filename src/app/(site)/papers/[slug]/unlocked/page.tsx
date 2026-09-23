import { grantForCheckoutSession } from "@/lib/grants";
import { getPaperBySlug } from "@/lib/papers";
import { getStripe } from "@/lib/stripe";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  if (!paper) return { title: "Access unlocked" };
  return { title: `Access unlocked · ${paper.title}` };
}

export default async function UnlockedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;
  const paper = await getPaperBySlug(slug);
  if (!paper) notFound();

  const stripe = getStripe();
  if (!sessionId || !stripe) {
    return (
      <UnlockedShell
        title="Purchase not found"
        body="We could not confirm this checkout. Return to the research page and try again, or use Already have access if you already paid."
        slug={paper.slug}
      />
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_email || session.customer_details?.email || session.metadata?.email;
    const paid =
      session.status === "complete" &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    if (!paid) {
      return (
        <UnlockedShell
          title="Payment incomplete"
          body="Stripe has not marked this checkout as paid. If you were charged, wait a moment and refresh, or contact the practice."
          slug={paper.slug}
        />
      );
    }

    const grant = await grantForCheckoutSession(session.id);
    const readHref = `/papers/${paper.slug}/read`;

    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
          Research access
        </p>
        <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">Access unlocked</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
          A confirmation and sign-in link {email ? <>were sent to <strong className="text-[var(--ink)]">{email}</strong></> : "were sent to your checkout email"}.
          This purchase covers {paper.title} and future research from the practice for your access period.
        </p>
        {grant ? null : (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">
            Access is still being confirmed. Use the email link in a moment, or refresh this page.
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={readHref}
            className="inline-flex justify-center rounded-full bg-[var(--green)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
          >
            Read Research
          </Link>
          <Link
            href="/papers"
            className="inline-flex justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-6 py-3 text-sm font-medium text-[var(--ink)]"
          >
            Go to Research Library
          </Link>
        </div>
      </div>
    );
  } catch {
    return (
      <UnlockedShell
        title="Could not verify checkout"
        body="Return to the research page if you still need to purchase, or sign in if you already have access."
        slug={paper.slug}
      />
    );
  }
}

function UnlockedShell({
  title,
  body,
  slug,
}: {
  title: string;
  body: string;
  slug: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-4xl text-[var(--ink)]">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">{body}</p>
      <Link href={`/papers/${slug}`} className="mt-8 text-sm text-[var(--green)] hover:underline">
        Back to this research
      </Link>
    </div>
  );
}
