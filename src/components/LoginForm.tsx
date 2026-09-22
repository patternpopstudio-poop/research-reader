"use client";

import { useActionState } from "react";
import { requestMagicLink } from "@/app/login/actions";

type Props = {
  nextPath: string;
  submitLabel?: string;
};

const initialState = { ok: false, message: "" };

export function LoginForm({ nextPath, submitLabel = "Email me a reading link" }: Props) {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex flex-col gap-2 text-sm text-[var(--ink-muted)]">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@clinic.org"
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
      >
        {pending ? "Sending link…" : submitLabel}
      </button>
      {state.message ? (
        <p className="text-sm text-[var(--ink-muted)]" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
