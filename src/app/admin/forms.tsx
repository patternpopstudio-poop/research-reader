"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  createInvite,
  updateBilling,
  updatePaperCopy,
  uploadCover,
  uploadPaper,
} from "@/app/admin/actions";
import { PAPER_TOPIC_NAMES, paperTopic } from "@/lib/paper-presentation";
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

type UploadPaper = {
  id: string;
  title: string;
  slug?: string;
  topic?: string;
  storage_path: string | null;
};

export function AdminPdfUpload({ papers }: { papers: UploadPaper[] }) {
  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-4 lg:mt-0">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Upload a PDF</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
        Choose the document, then a PDF from your computer.
      </p>
      <div className="mt-3">
        <UploadForm papers={papers} compact />
      </div>
    </section>
  );
}

export function UploadForm({ papers, compact = false }: { papers: UploadPaper[]; compact?: boolean }) {
  const [state, action, pending] = useActionState(uploadPaper, empty);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const grouped = useMemo(() => papers.map((paper) => ({ ...paper, topic: paper.topic || paperTopic(paper.slug ?? "") })), [papers]);
  const topics = useMemo(() => topicOrder(grouped.map((paper) => paper.topic)), [grouped]);
  const [topic, setTopic] = useState(topics[0] ?? "");
  const inTopic = grouped.filter((paper) => paper.topic === topic);
  const [paperId, setPaperId] = useState(inTopic[0]?.id ?? "");

  function rememberFile(file: File | undefined) {
    if (!file) {
      setFileLabel(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setHint("Choose a PDF file.");
      setFileLabel(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setHint("");
    setFileLabel(`${file.name} · ${formatFileSize(file.size)}`);
  }

  return (
    <form
      action={action}
      className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}
      onSubmit={(event) => {
        if (!fileRef.current?.files?.length) {
          event.preventDefault();
          setHint("Choose a PDF from your computer first.");
        }
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--ink)]">Topic</span>
        <select
          value={topic}
          onChange={(event) => {
            const next = event.target.value;
            setTopic(next);
            const first = grouped.find((paper) => paper.topic === next);
            setPaperId(first?.id ?? "");
          }}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2"
        >
          {topics.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--ink)]">Papers in {topic || "this topic"}</span>
        <select
          name="paper_id"
          required
          value={paperId}
          onChange={(event) => setPaperId(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2"
        >
          {inTopic.map((paper) => (
            <option key={paper.id} value={paper.id}>
              {paper.title}
              {paper.storage_path ? " · PDF already uploaded" : " · no PDF yet"}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--ink-muted)]">
          This is the same {topic || "topic"} list as the library. The uploaded PDF appears with these papers.
        </span>
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--ink)]">PDF file</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (!file || !fileRef.current) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            fileRef.current.files = transfer.files;
            rememberFile(file);
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--green)] bg-[#f7faf2] px-4 text-center transition hover:bg-[#f0f5e4] ${compact ? "min-h-20 py-4" : "min-h-44 py-10"}`}
        >
          <span className="font-medium text-[var(--ink)]">
            {fileLabel ?? "Choose a PDF from your computer"}
          </span>
          <span className="mt-1 text-xs text-[var(--ink-muted)]">
            {fileLabel ? "Click to choose a different file, or drop one here" : "Click here to open your files, or drop a PDF here"}
          </span>
        </button>
        <input
          ref={fileRef}
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => rememberFile(event.currentTarget.files?.[0])}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !fileLabel}
          className="rounded-full bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--green-dark)] disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload to library"}
        </button>
        {fileLabel ? (
          <button
            type="button"
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
            onClick={() => {
              if (fileRef.current) fileRef.current.value = "";
              setFileLabel(null);
              setHint("");
            }}
          >
            Clear file
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-sm text-red-800">{hint}</p> : null}
      {state.message ? <p className="text-sm text-[var(--ink-muted)]">{state.message}</p> : null}
    </form>
  );
}

function topicOrder(names: string[]) {
  const present = new Set(names.filter(Boolean));
  const known = PAPER_TOPIC_NAMES.filter((name) => present.has(name));
  const extra = [...present].filter((name) => !PAPER_TOPIC_NAMES.includes(name)).sort((a, b) => a.localeCompare(b));
  return [...known, ...extra];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <p className="text-sm leading-6 text-[var(--ink-muted)]">
        The public plan is $7.99 per month. Checkout charges that subscription.
      </p>
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
