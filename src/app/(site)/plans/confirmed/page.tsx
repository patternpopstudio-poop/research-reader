import { grantForCheckoutSession } from "@/lib/grants";
import { LIBRARY_PLAN } from "@/lib/plan";
import { getStripe } from "@/lib/stripe";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subscription confirmed",
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function PlanConfirmedPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  const stripe = getStripe();

  if (!sessionId || !stripe) {
    return (
      <ConfirmedShell
        title="Purchase not found"
        body="We could not confirm this checkout. Return to the plan and try again, or sign in if you already subscribed."
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
        <ConfirmedShell
          title="Payment incomplete"
          body="Stripe has not marked this checkout as paid. If you were charged, wait a moment and refresh."
        />
      );
    }

    const grant = await grantForCheckoutSession(session.id);

    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Research access</p>
        <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">Subscription started</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
          A confirmation and sign-in link{" "}
          {email ? (
            <>
              were sent to <strong className="text-[var(--ink)]">{email}</strong>
            </>
          ) : (
            "were sent to your checkout email"
          )}
          . The {LIBRARY_PLAN.priceLabel} monthly plan covers the published library and papers released during each
          paid month.
        </p>
        {grant ? null : (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">
            Access is still being confirmed. Use the email link in a moment, or refresh this page.
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login?next=/"
            className="inline-flex justify-center rounded-full bg-[var(--green)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
          >
            Sign in
          </Link>
          <Link
            href="/plans"
            className="inline-flex justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-6 py-3 text-sm font-medium text-[var(--ink)]"
          >
            Back to the plan
          </Link>
        </div>
      </div>
    );
  } catch {
    return (
      <ConfirmedShell
        title="Could not verify checkout"
        body="Return to the plan if you still need to subscribe, or sign in if you already have access."
      />
    );
  }
}

function ConfirmedShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-4xl text-[var(--ink)]">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">{body}</p>
      <Link href="/plans" className="mt-8 text-sm text-[var(--green)] hover:underline">
        Back to the plan
      </Link>
    </div>
  );
}
