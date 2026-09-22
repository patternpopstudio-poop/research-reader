"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewerLock } from "@/components/ViewerLock";

type Props = {
  slug: string;
  title: string;
  watermark: string;
};

type PdfjsModule = typeof import("pdfjs-dist");

export function PdfViewer({ slug, title, watermark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [hidden, setHidden] = useState(false);
  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const renderPages = useCallback(async () => {
    const pdf = pdfRef.current;
    const root = containerRef.current;
    if (!pdf || !root) return;

    root.replaceChildren();

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const wrap = document.createElement("div");
      wrap.className = "page-sheet relative mx-auto mb-6 overflow-hidden bg-white shadow-sm";
      wrap.style.width = `${viewport.width}px`;
      wrap.style.height = `${viewport.height}px`;

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = "block";
      wrap.appendChild(canvas);

      const overlay = document.createElement("div");
      overlay.className = "watermark-layer";
      overlay.setAttribute("aria-hidden", "true");
      overlay.textContent = `${watermark}  ·  ${new Date().toISOString().slice(0, 16)}`;
      wrap.appendChild(overlay);

      root.appendChild(wrap);

      await page.render({ canvas, viewport }).promise;
    }
  }, [scale, watermark]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const response = await fetch(`/api/papers/${slug}/file`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!cancelled) setStatus("missing");
          return;
        }
        if (!response.ok) throw new Error("fetch failed");

        const data = await response.arrayBuffer();
        const pdfjs: PdfjsModule = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({ data, disableStream: true, disableRange: true });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.cleanup();
          return;
        }
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
      void pdfRef.current?.cleanup();
      pdfRef.current = null;
    };
  }, [slug]);

  useEffect(() => {
    if (status === "ready") {
      void renderPages();
    }
  }, [status, renderPages]);

  return (
    <div className="select-none" onContextMenu={(e) => e.preventDefault()}>
      <ViewerLock />
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--cream)]/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg text-[var(--ink)]">{title}</p>
          <p className="text-xs text-[var(--ink-muted)]">
            Read only · {pageCount ? `${pageCount} pages` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
            onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
          >
            −
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
            onClick={() => setScale((s) => Math.min(2, s + 0.15))}
          >
            +
          </button>
        </div>
      </header>

      {status === "loading" ? (
        <p className="px-6 py-16 text-center text-sm text-[var(--ink-muted)]">Opening paper…</p>
      ) : null}
      {status === "missing" ? (
        <p className="px-6 py-16 text-center text-sm text-[var(--ink-muted)]">
          This paper is listed, but the PDF has not been uploaded yet.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="px-6 py-16 text-center text-sm text-red-800">
          The paper could not be loaded. Ask the library administrator to check your invite.
        </p>
      ) : null}

      <div ref={containerRef} className="px-4 py-8" />

      {hidden ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cream)]">
          <p className="font-serif text-xl text-[var(--ink)]">Reading paused</p>
        </div>
      ) : null}
    </div>
  );
}
