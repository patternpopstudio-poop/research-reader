"use client";

import { useActionState } from "react";
import { startCheckout } from "@/app/papers/actions";

export function PurchaseAccessForm({ slug, email }: { slug: string; email?: string }) {
  const [state, action, pending] = useActionState(startCheckout, { message: "" });

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <label className="flex flex-col gap-2 text-sm text-[var(--ink-muted)]">
          Email for this purchase
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@clinic.org"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
      >
        {pending ? "Opening checkout…" : "Purchase & Unlock Access"}
      </button>
      {email ? <p className="text-xs text-[var(--ink-muted)]">Checkout will use {email}.</p> : null}
      {state.message ? (
        <p className="text-sm text-[var(--ink-muted)]" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
