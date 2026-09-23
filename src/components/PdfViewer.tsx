"use client";

import { LimitReachedModal } from "@/components/LimitReachedModal";
import { ViewerLock } from "@/components/ViewerLock";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  slug: string;
  title: string;
  watermark: string;
  email?: string;
  previewPageLimit?: number;
};

type PdfjsModule = typeof import("pdfjs-dist");
type RenderTask = { cancel: () => void; promise: Promise<void> };

export function PdfViewer({ slug, title, watermark, email, previewPageLimit }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const renderGeneration = useRef(0);
  const renderTask = useRef<RenderTask | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [hidden, setHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    const root = containerRef.current;
    if (!pdf || !root) return;

    const generation = ++renderGeneration.current;
    renderTask.current?.cancel();

    try {
      const maxPage = previewPageLimit ? Math.min(pdf.numPages, previewPageLimit) : pdf.numPages;
      const pageNumber = Math.min(Math.max(page, 1), maxPage);
      const pdfPage = await pdf.getPage(pageNumber);
      if (generation !== renderGeneration.current) return;

      const viewport = pdfPage.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const wrap = document.createElement("div");
      wrap.className = "page-sheet relative mx-auto overflow-hidden bg-white shadow-sm";
      wrap.style.width = `${viewport.width}px`;
      wrap.style.height = `${viewport.height}px`;

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.className = "block";
      wrap.appendChild(canvas);

      const overlay = document.createElement("div");
      overlay.className = "watermark-layer";
      overlay.setAttribute("aria-hidden", "true");
      for (let copy = 0; copy < 8; copy += 1) {
        const line = document.createElement("span");
        line.textContent = watermark;
        overlay.appendChild(line);
      }
      wrap.appendChild(overlay);

      root.replaceChildren(wrap);
      const task = pdfPage.render({
        canvas,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      renderTask.current = task;
      await task.promise;
      if (generation !== renderGeneration.current) return;
    } catch (error) {
      if (generation !== renderGeneration.current) return;
      const name = error instanceof Error ? error.name : "";
      if (name === "RenderingCancelledException") return;
      setStatus("error");
    }
  }, [page, previewPageLimit, scale, watermark]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setPage(1);
      setPageCount(0);
      containerRef.current?.replaceChildren();
      try {
        const response = await fetch(`/api/papers/${slug}/file`, {
          credentials: "include",
          cache: "no-store",
          headers: { "X-Reader": "1" },
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
      renderGeneration.current += 1;
      renderTask.current?.cancel();
      void pdfRef.current?.cleanup();
      pdfRef.current = null;
    };
  }, [slug]);

  useEffect(() => {
    if (status === "ready") {
      void renderPage();
    }
  }, [status, renderPage]);

  const previewBlocked = Boolean(previewPageLimit && pageCount > previewPageLimit && page >= previewPageLimit);

  const requestNext = useCallback(() => {
    if (previewPageLimit && pageCount > previewPageLimit && page >= previewPageLimit) {
      setLimitOpen(true);
      return;
    }
    setPage((current) => Math.min(pageCount || current, current + 1));
  }, [page, pageCount, previewPageLimit]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPage((current) => Math.max(1, current - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        requestNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestNext]);

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
  }

  const atStart = page <= 1;
  const atEnd = pageCount === 0 || page >= pageCount;

  return (
    <div
      ref={shellRef}
      className="viewer-shell select-none bg-[var(--cream)]"
      onContextMenu={(event) => event.preventDefault()}
    >
      <ViewerLock />
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--cream)]/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg text-[var(--ink)]">{title}</p>
          <p className="text-xs text-[var(--ink-muted)]">
            {previewPageLimit ? `Free preview · first ${previewPageLimit} pages` : "Read only"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={atStart || status !== "ready"}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="min-w-14 text-center text-sm text-[var(--ink-muted)]" aria-live="polite">
            {pageCount ? `${page} / ${pageCount}` : "—"}
          </span>
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm disabled:opacity-40"
            onClick={requestNext}
            disabled={(atEnd && !previewBlocked) || status !== "ready"}
            aria-label="Next page"
          >
            Next
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
            onClick={() => setScale((current) => Math.max(0.7, Number((current - 0.15).toFixed(2))))}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
            onClick={() => setScale((current) => Math.min(2, Number((current + 0.15).toFixed(2))))}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? "Exit" : "Full screen"}
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
      {previewPageLimit ? (
        <LimitReachedModal open={limitOpen} onClose={() => setLimitOpen(false)} email={email} reason="pages" />
      ) : null}
    </div>
  );
}
