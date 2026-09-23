"use client";

import { useActionState } from "react";
import { startCheckout } from "@/app/papers/actions";

export function PurchaseAccessForm({
  slug,
  email,
  variant = "default",
}: {
  slug: string;
  email?: string;
  variant?: "default" | "access";
}) {
  const [state, action, pending] = useActionState(startCheckout, { message: "" });
  const access = variant === "access";

  return (
    <form action={action} className={access ? "flex flex-col gap-3" : "mt-6 flex flex-col gap-3"}>
      <input type="hidden" name="slug" value={slug} />
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <label className="flex flex-col gap-2 text-sm text-[var(--ink-muted)]">
          <span className={access ? "sr-only" : undefined}>Email for this purchase</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder={access ? "Enter your email address" : "you@clinic.org"}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className={
          access
            ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
            : "rounded-full bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
        }
      >
        {pending ? "Opening checkout…" : "Purchase & Unlock Access"}
        {access && !pending ? <span aria-hidden="true">→</span> : null}
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
