"use client";

import { PurchaseAccessForm } from "@/components/PurchaseAccessForm";
import { FREE_DOCUMENT_LIMIT, FREE_PAGE_LIMIT } from "@/lib/free-preview";
import { LIBRARY_PLAN } from "@/lib/plan";
import Link from "next/link";
import { useState } from "react";

export function LimitReachedModal({
  open,
  onClose,
  email,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  email?: string;
  reason: "pages" | "documents";
}) {
  if (!open) return null;

  const detail =
    reason === "pages"
      ? `Free access includes the first ${FREE_PAGE_LIMIT} pages of a document.`
      : `Free access includes ${FREE_DOCUMENT_LIMIT} documents, and only the first ${FREE_PAGE_LIMIT} pages of each.`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-reached-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Free access</p>
            <h2 id="limit-reached-title" className="mt-2 font-serif text-3xl text-[var(--ink)]">
              Limit reached
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Close
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          {detail} Subscribe to read every page of the research library.
        </p>

        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-muted)]">{LIBRARY_PLAN.name}</p>
          <p className="mt-2 font-serif text-4xl text-[var(--ink)]">
            {LIBRARY_PLAN.priceLabel}
            <span className="ml-2 font-sans text-base font-medium text-[var(--ink-muted)]">{LIBRARY_PLAN.cadenceLabel}</span>
          </p>
          <ul className="mt-4 space-y-3">
            {LIBRARY_PLAN.includes.map((item) => (
              <li key={item.title} className="text-sm leading-6 text-[var(--ink-muted)]">
                <span className="font-medium text-[var(--ink)]">{item.title}. </span>
                {item.detail}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <PurchaseAccessForm
              variant="access"
              email={email}
              submitLabel={`Subscribe for ${LIBRARY_PLAN.priceLabel} / month`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentLimitScreen({ email }: { email: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">Free access</p>
      <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">Limit reached</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
        Free access includes the first {FREE_PAGE_LIMIT} pages of {FREE_DOCUMENT_LIMIT} documents. Subscribe to open
        the rest of the library.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex justify-center rounded-full bg-[var(--green)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--green-dark)]"
        >
          View plans
        </button>
        <Link
          href="/papers"
          className="inline-flex justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-6 py-3 text-sm font-medium text-[var(--ink)]"
        >
          Back to the library
        </Link>
      </div>
      <LimitReachedModal open={open} onClose={() => setOpen(false)} email={email} reason="documents" />
    </div>
  );
}
