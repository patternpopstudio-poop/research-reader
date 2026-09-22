"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createInvite,
  updateBilling,
  updatePaperCopy,
  uploadCover,
  uploadPaper,
} from "@/app/admin/actions";
import type { BillingSettings, Paper } from "@/lib/types";

const empty = { message: "" };

export function InviteForm({ papers }: { papers: Paper[] }) {
  const [state, action, pending] = useActionState(createInvite, empty);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="reader@example.com"
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
      />
      <select name="paper_id" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
        <option value="">All papers (library grant)</option>
        {papers.map((paper) => (
          <option key={paper.id} value={paper.id}>
            {paper.title}
          </option>
        ))}
      </select>
      <label className="text-sm text-[var(--ink-muted)]">
        Expires in days
        <input
          name="days"
          type="number"
          min={1}
          defaultValue={30}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save invite"}
      </button>
      {state.message ? <p className="text-sm text-[var(--ink-muted)]">{state.message}</p> : null}
    </form>
  );
}

export function UploadForm({ papers }: { papers: Paper[] }) {
  const [state, action, pending] = useActionState(uploadPaper, empty);

  return (
    <form action={action} className="flex flex-col gap-3">
      <select name="paper_id" required className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
        <option value="">Select paper</option>
        {papers.map((paper) => (
          <option key={paper.id} value={paper.id}>
            {paper.title}
            {paper.storage_path ? " (has PDF)" : ""}
          </option>
        ))}
      </select>
      <input name="file" type="file" accept="application/pdf" required className="text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload PDF"}
      </button>
      {state.message ? <p className="text-sm text-[var(--ink-muted)]">{state.message}</p> : null}
    </form>
  );
}

export function CoverForm({ papers }: { papers: Paper[] }) {
  const [state, action, pending] = useActionState(uploadCover, empty);

  return (
    <form action={action} className="flex flex-col gap-3">
      <select name="paper_id" required className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
        <option value="">Select paper</option>
        {papers.map((paper) => (
          <option key={paper.id} value={paper.id}>
            {paper.title}
            {paper.cover_path ? " (has cover)" : ""}
          </option>
        ))}
      </select>
      <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload cover"}
      </button>
      {state.message ? <p className="text-sm text-[var(--ink-muted)]">{state.message}</p> : null}
    </form>
  );
}

export function PaperCopyForm({ papers }: { papers: Paper[] }) {
  const [paperId, setPaperId] = useState(papers[0]?.id ?? "");
  const paper = useMemo(() => papers.find((item) => item.id === paperId), [papers, paperId]);
  const [state, action, pending] = useActionState(updatePaperCopy, empty);

  if (!paper) return <p className="text-sm text-[var(--ink-muted)]">Add a paper first.</p>;

  return (
    <form key={paper.id} action={action} className="flex flex-col gap-3">
      <select
        name="paper_id"
        required
        value={paperId}
        onChange={(event) => setPaperId(event.target.value)}
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
      >
        {papers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      <label className="text-sm text-[var(--ink-muted)]">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={paper.description ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <label className="text-sm text-[var(--ink-muted)]">
        What’s included (one line per item)
        <textarea
          name="contents"
          rows={5}
          defaultValue={(paper.contents ?? []).join("\n")}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <label className="text-sm text-[var(--ink-muted)]">
        Highlights (one line per item)
        <textarea
          name="highlights"
          rows={3}
          defaultValue={(paper.highlights ?? []).join("\n")}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save copy"}
      </button>
      {state.message ? <p className="text-sm text-[var(--ink-muted)]">{state.message}</p> : null}
    </form>
  );
}

export function BillingForm({ settings }: { settings: BillingSettings | null }) {
  const [state, action, pending] = useActionState(updateBilling, empty);
  const price = settings ? (settings.price_cents / 100).toString() : "0";

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="text-sm text-[var(--ink-muted)]">
        Price (major units, e.g. rupees)
        <input
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={price}
          required
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-[var(--ink-muted)]">
          Currency
          <input
            name="currency"
            defaultValue={settings?.currency ?? "INR"}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
          />
        </label>
        <label className="text-sm text-[var(--ink-muted)]">
          Interval
          <select
            name="interval"
            defaultValue={settings?.billing_interval ?? "year"}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
          >
            <option value="year">Year</option>
            <option value="month">Month</option>
          </select>
        </label>
      </div>
      <label className="text-sm text-[var(--ink-muted)]">
        Company name
        <input
          name="company_name"
          defaultValue={settings?.company_name ?? "Dr. Prathiba Reddy"}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <label className="text-sm text-[var(--ink-muted)]">
        Support email
        <input
          name="support_email"
          type="email"
          defaultValue={settings?.support_email ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <label className="text-sm text-[var(--ink-muted)]">
        What’s included (checkout copy)
        <textarea
          name="included_copy"
          rows={3}
          defaultValue={
            settings?.included_copy ??
            "This document and future research from the practice for the subscription period."
          }
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save billing"}
      </button>
      {state.message ? <p className="text-sm text-[var(--ink-muted)]">{state.message}</p> : null}
    </form>
  );
}
