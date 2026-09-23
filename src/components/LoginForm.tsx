"use client";

import { useActionState } from "react";
import { signInWithEmailPassword } from "@/app/login/actions";

type Props = {
  nextPath: string;
  submitLabel?: string;
  variant?: "default" | "access" | "signin";
};

const initialState = { ok: false, message: "" };

export function LoginForm({ nextPath, submitLabel = "Sign in", variant = "default" }: Props) {
  const [state, formAction, pending] = useActionState(signInWithEmailPassword, initialState);
  const access = variant === "access";
  const signin = variant === "signin";
  const wide = access || signin;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex flex-col gap-2 text-sm text-[var(--ink-muted)]">
        <span className={access ? "sr-only" : undefined}>{signin ? "Email address" : "Email"}</span>
        <span className="relative block">
          {signin ? <MailIcon /> : null}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder={access ? "Enter your email address" : "you@clinic.org"}
            className={`rounded-lg border border-[var(--line)] bg-white py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2 ${signin ? "w-full pl-10 pr-3" : "px-3"}`}
          />
        </span>
      </label>
      <label className="flex flex-col gap-2 text-sm text-[var(--ink-muted)]">
        <span className={access ? "sr-only" : undefined}>Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder={access ? "Enter your password" : "Password"}
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={
          wide
            ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
            : "rounded-full bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
        }
      >
        {pending ? "Signing in…" : submitLabel}
        {wide && !pending ? <span aria-hidden="true">→</span> : null}
      </button>
      {state.message ? (
        <p className="text-sm text-[var(--ink-muted)]" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
