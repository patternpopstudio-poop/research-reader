"use client";

import { PdfCover } from "@/components/PdfCover";
import { CLINIC_PAPER_LINKS } from "@/lib/clinic-papers";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type LibraryCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  published: string | null;
  sortAt: number;
  topic: string;
  pages: number | null;
  isNew: boolean;
  readable: boolean;
  href: string;
};

type Section = "all" | "library" | "favourites";
type SortOrder = "latest" | "oldest";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 8;
const FAVOURITES_KEY = "research-reader-favourites";
const FAVOURITES_EVENT = "research-reader-favourites-change";

export function LibraryBrowser({
  catalog,
  library,
  email,
  canUpload = false,
  view = null,
  topic: topicQuery = null,
}: {
  catalog: LibraryCard[];
  library: LibraryCard[];
  email: string | null;
  canUpload?: boolean;
  view?: string | null;
  topic?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const topic = topicQuery && topicQuery.length > 0 ? topicQuery : "all";
  const [section, setSection] = useState<Section>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("latest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const filterKey = `${topic}:${view ?? ""}`;
  const [pageFilter, setPageFilter] = useState(filterKey);
  const showingTopics = view === "topics" && topic === "all" && query.trim() === "";
  const favouritesRaw = useSyncExternalStore(subscribeFavourites, readFavouritesRaw, () => "[]");
  const favourites = useMemo(() => parseFavourites(favouritesRaw), [favouritesRaw]);

  const filterKeyNow = `${topic}:${view ?? ""}`;
  if (pageFilter !== filterKeyNow) {
    setPageFilter(filterKeyNow);
    setPage(1);
  }

  const favouriteSet = useMemo(() => new Set(favourites), [favourites]);
  const topicNames = useMemo(() => {
    const names = new Set(catalog.map((paper) => paper.topic));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [catalog]);
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const paper of catalog) counts.set(paper.topic, (counts.get(paper.topic) ?? 0) + 1);
    return counts;
  }, [catalog]);
  const source =
    section === "favourites"
      ? catalog.filter((paper) => favouriteSet.has(paper.slug))
      : section === "library"
        ? library
        : catalog;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = source.filter((paper) => {
      if (topic !== "all" && paper.topic !== topic) return false;
      if (!needle) return true;
      return `${paper.title} ${paper.subtitle ?? ""} ${paper.topic}`.toLowerCase().includes(needle);
    });
    const direction = sort === "latest" ? -1 : 1;
    return [...filtered].sort((a, b) => (a.sortAt - b.sortAt) * direction || a.title.localeCompare(b.title));
  }, [source, query, topic, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const signedIn = Boolean(email);
  const showLibraryPrompt = section === "library" && !signedIn;

  function resetPage() {
    setPage(1);
  }

  function pushParams(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function chooseSection(next: Section) {
    setSection(next);
    resetPage();
    const params = new URLSearchParams();
    if (next !== "all" && topic !== "all") params.set("topic", topic);
    pushParams(params);
  }

  function showTopics() {
    setSection("all");
    setQuery("");
    resetPage();
    const params = new URLSearchParams();
    params.set("view", "topics");
    pushParams(params);
  }

  function chooseTopic(next: string) {
    setSection("all");
    resetPage();
    const params = new URLSearchParams();
    if (next !== "all") params.set("topic", next);
    pushParams(params);
  }

  useEffect(() => {
    if (!showingTopics) return;
    document.getElementById("library-topics")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showingTopics]);

  function toggleFavourite(slug: string) {
    const next = favourites.includes(slug) ? favourites.filter((item) => item !== slug) : [...favourites, slug];
    window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(FAVOURITES_EVENT));
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex flex-col border-b border-[var(--line)] bg-white px-3 py-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-5">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Library">
          <SectionButton
            active={section === "all" && !showingTopics && topic === "all"}
            onClick={() => chooseSection("all")}
            icon={<GridIcon />}
          >
            All Research
          </SectionButton>
          <SectionButton active={section === "library"} onClick={() => chooseSection("library")} icon={<LibraryIcon />}>
            My Library
          </SectionButton>
          <SectionButton
            active={section === "favourites"}
            onClick={() => chooseSection("favourites")}
            icon={<HeartIcon />}
          >
            Favourites
          </SectionButton>
          {canUpload ? (
            <Link
              href="/upload"
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm text-[var(--ink-muted)] hover:bg-[#f7faf2] hover:text-[var(--ink)]"
            >
              <UploadIcon />
              Upload PDF
            </Link>
          ) : null}
        </nav>

        <div className="mt-5">
          <button
            type="button"
            onClick={showTopics}
            aria-current={showingTopics ? "page" : undefined}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
              showingTopics
                ? "bg-[#f0f5e4] font-medium text-[var(--ink)]"
                : "text-[var(--ink-muted)] hover:bg-[#f7faf2] hover:text-[var(--ink)]"
            }`}
          >
            <LayersIcon />
            <span className="flex-1">Topics</span>
          </button>
          <div className="mt-1 flex flex-wrap gap-1 pl-8 lg:flex-col">
            {topicNames.map((name) => (
              <TopicButton key={name} active={!showingTopics && topic === name} onClick={() => chooseTopic(name)}>
                {name}
              </TopicButton>
            ))}
          </div>
        </div>

        <a
          href="#help"
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] lg:mt-auto"
        >
          <LifeRingIcon />
          Help & Support
        </a>
      </aside>

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(105deg,#f0f5e4_0%,#f7faf2_46%,#e3efc4_100%)] px-6 py-8 sm:px-8 sm:py-10">
          <HeroArt />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--green)]">Research library</p>
          <h1 className="relative mt-3 max-w-xl text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Evidence for Better Care
          </h1>
          <p className="relative mt-3 max-w-xl text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px]">
            Explore our collection of peer-reviewed research, clinical guides and practical resources — curated by
            experts, for a healthier tomorrow.
          </p>
          <ul className="relative mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--ink)]">
            <li className="flex items-center gap-2">
              <BadgeIcon>
                <BookIcon />
              </BadgeIcon>
              Peer-reviewed research
            </li>
            <li className="flex items-center gap-2">
              <BadgeIcon>
                <PeopleIcon />
              </BadgeIcon>
              Curated by clinical experts
            </li>
            <li className="flex items-center gap-2">
              <BadgeIcon>
                <LockIcon />
              </BadgeIcon>
              Secure & protected access
            </li>
          </ul>
        </section>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search research</span>
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder="Search by title, topic or keyword..."
              className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] outline-none ring-[var(--green)] placeholder:text-[var(--ink-muted)] focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="sr-only">Topic</span>
            <select
              value={topic}
              onChange={(event) => chooseTopic(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2 lg:w-40"
            >
              <option value="all">All Topics</option>
              {topicNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortOrder);
                resetPage();
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none ring-[var(--green)] focus:ring-2 lg:w-36"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </label>
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
            <ViewButton active={viewMode === "grid"} label="Grid view" onClick={() => setViewMode("grid")}>
              <GridIcon />
            </ViewButton>
            <ViewButton active={viewMode === "list"} label="List view" onClick={() => setViewMode("list")}>
              <RowsIcon />
            </ViewButton>
          </div>
        </div>

        {showLibraryPrompt ? (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6">
            <p className="text-sm text-[var(--ink)]">Sign in to see the research you can read.</p>
            <Link
              href="/login?next=/"
              className="mt-4 inline-flex rounded-full bg-[var(--green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--green-dark)]"
            >
              Sign in
            </Link>
          </div>
        ) : source.length === 0 && section === "library" ? (
          <div className="mt-8">
            <p className="text-sm text-red-800">
              No active access found for {email}. Purchase access to read this research and future papers from the
              practice.
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {CLINIC_PAPER_LINKS.map((paper) => (
                <li key={paper.slug}>
                  <Link href={`/papers/${paper.slug}`} className="text-[var(--green)] hover:underline">
                    {paper.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : source.length === 0 && section === "favourites" ? (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">
            No saved research yet. Bookmark a document to keep it here.
          </p>
        ) : source.length === 0 && section === "all" ? (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">No research has been published yet.</p>
        ) : showingTopics ? (
          <section id="library-topics" className="mt-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-[var(--ink)]">Topics</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Choose a topic to see the research in it.</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topicNames.map((name) => {
                const count = topicCounts.get(name) ?? 0;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => chooseTopic(name)}
                      className="flex h-full w-full flex-col rounded-2xl border border-[var(--line)] bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[color-mix(in_srgb,var(--green)_45%,var(--line))]"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--green)]">
                        Topic
                      </span>
                      <span className="mt-2 text-lg font-semibold text-[var(--ink)]">{name}</span>
                      <span className="mt-1 text-sm text-[var(--ink-muted)]">
                        {count} research {count === 1 ? "document" : "documents"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <>
            <div className="mt-5 flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-[var(--ink)]">
                {topic !== "all" ? (
                  <span className="mr-2 text-base font-semibold">{topic}</span>
                ) : null}
                {visible.length} research {visible.length === 1 ? "document" : "documents"}
              </p>
              {topic !== "all" ? (
                <button type="button" onClick={showTopics} className="text-sm text-[var(--green)] hover:underline">
                  All topics
                </button>
              ) : null}
            </div>
            {visible.length === 0 ? (
              <p className="mt-6 text-sm text-[var(--ink-muted)]">
                {section === "favourites" ? "No saved research matches that filter." : "No research matches that filter."}
              </p>
            ) : (
              <ul
                className={
                  viewMode === "grid"
                    ? "mt-4 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(15.5rem,1fr))]"
                    : "mt-4 flex flex-col gap-3"
                }
              >
                {pageItems.map((paper) => (
                  <li key={paper.id}>
                    <article
                      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[color-mix(in_srgb,var(--green)_45%,var(--line))] ${
                        viewMode === "list" ? "flex" : "flex h-full flex-col"
                      }`}
                    >
                      <Link href={paper.href} className={viewMode === "list" ? "w-40 shrink-0 sm:w-52" : "block"}>
                        <Cover paper={paper} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--green)]">
                          {paper.topic}
                        </p>
                        <Link href={paper.href} className="mt-1.5 text-[15px] font-semibold leading-snug text-[var(--ink)] hover:underline">
                          {paper.title}
                        </Link>
                        {paper.subtitle ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--ink-muted)]">{paper.subtitle}</p>
                        ) : null}
                        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[var(--ink-muted)]">
                          {paper.pages ? (
                            <span className="inline-flex items-center gap-1">
                              <PageIcon />
                              {paper.pages} pages
                            </span>
                          ) : null}
                          {paper.published ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon />
                              {paper.published}
                            </span>
                          ) : null}
                          {!paper.readable ? <span className="text-[var(--green)]">Get access</span> : null}
                          <button
                            type="button"
                            onClick={() => toggleFavourite(paper.slug)}
                            aria-pressed={favouriteSet.has(paper.slug)}
                            aria-label={favouriteSet.has(paper.slug) ? `Remove ${paper.title} from favourites` : `Save ${paper.title}`}
                            className={`ml-auto rounded-md p-1 ${
                              favouriteSet.has(paper.slug) ? "text-[var(--green)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                            }`}
                          >
                            <BookmarkIcon filled={favouriteSet.has(paper.slug)} />
                          </button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
            {visible.length > 0 ? (
              <Pagination page={currentPage} pageCount={pageCount} onPage={setPage} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Cover({ paper }: { paper: LibraryCard }) {
  return (
    <div className="relative">
      {paper.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- cover host is the project's Supabase URL
        <img src={paper.coverUrl} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : (
        <PdfCover />
      )}
      {paper.isNew ? (
        <span className="absolute left-3 top-3 rounded-full bg-[var(--green)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          New
        </span>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  const items = pageWindow(page, pageCount);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <PageStep label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ‹
      </PageStep>
      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-[var(--ink-muted)]">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item)}
            aria-current={item === page ? "page" : undefined}
            className={`h-8 min-w-8 rounded-lg px-2 text-sm ${
              item === page
                ? "bg-[var(--green)] font-medium text-white"
                : "text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <PageStep label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        ›
      </PageStep>
    </nav>
  );
}

function PageStep({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function pageWindow(page: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const wanted = new Set([1, total, page, page - 1, page + 1].filter((value) => value >= 1 && value <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  for (const value of sorted) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && value - previous > 1) items.push("gap");
    items.push(value);
  }
  return items;
}

function subscribeFavourites(onStoreChange: () => void) {
  window.addEventListener(FAVOURITES_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(FAVOURITES_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readFavouritesRaw() {
  try {
    return window.localStorage.getItem(FAVOURITES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseFavourites(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function SectionButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm ${
        active ? "bg-[#f0f5e4] font-medium text-[var(--ink)]" : "text-[var(--ink-muted)] hover:bg-[#f7faf2] hover:text-[var(--ink)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function TopicButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-2 py-1.5 text-left text-sm ${
        active ? "font-medium text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center ${
        active ? "bg-[var(--green)] text-white" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function BadgeIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[var(--green)] shadow-sm">
      {children}
    </span>
  );
}

function HeroArt() {
  return (
    <svg
      viewBox="0 0 420 280"
      className="pointer-events-none absolute -right-6 top-0 hidden h-full w-[46%] sm:block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ribbon-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c5d98a" />
          <stop offset="1" stopColor="#5b7a12" />
        </linearGradient>
        <linearGradient id="ribbon-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0f5e4" />
          <stop offset="1" stopColor="#8fb837" />
        </linearGradient>
      </defs>
      <path
        d="M80 40c80 10 120 70 90 120-30 50 20 90 90 80 40-6 70 20 90 50"
        fill="none"
        stroke="url(#ribbon-a)"
        strokeWidth="46"
        strokeLinecap="round"
      />
      <path
        d="M40 120c90-30 150 10 170 70 20 60 80 70 140 40"
        fill="none"
        stroke="url(#ribbon-b)"
        strokeWidth="28"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16.5 20 20.5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

function RowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 16V6" />
      <path d="M8.5 9.5 12 6l3.5 3.5" />
      <path d="M5 18.5h14" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 5.5h9.5A2.5 2.5 0 0 1 18 8v11H8.5A2.5 2.5 0 0 0 6 21.5V5.5z" />
      <path d="M6 18.8A2.5 2.5 0 0 1 8.5 16.5H18" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 19s-6.2-3.7-6.2-8A3.4 3.4 0 0 1 12 8.6 3.4 3.4 0 0 1 18.2 11c0 4.3-6.2 8-6.2 8z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4.5 20 8.5 12 12.5 4 8.5 12 4.5z" />
      <path d="M4 12.5 12 16.5 20 12.5" />
      <path d="M4 16 12 20 20 16" />
    </svg>
  );
}

function LifeRingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M9.2 9.2 6.8 6.8M14.8 9.2l2.4-2.4M9.2 14.8l-2.4 2.4M14.8 14.8l2.4 2.4" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 5.5h9.5A2.5 2.5 0 0 1 18 8v11H8.5A2.5 2.5 0 0 0 6 21.5V5.5z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="9" r="2.2" />
      <circle cx="16" cy="10" r="1.8" />
      <path d="M4.8 17.5c.5-2.2 2-3.4 4.2-3.4s3.7 1.2 4.2 3.4" />
      <path d="M13.6 14.4c1.2-.3 2.3 0 3.2.8.8.7 1.3 1.7 1.5 2.8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="6" y="10.5" width="12" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

function PageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 4.5h7l4 4V19.5H7z" />
      <path d="M14 4.5v4h4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4.5" y="6" width="15" height="13.5" rx="2" />
      <path d="M8 4.5v3M16 4.5v3M4.5 10.5h15" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 4.5h10v15l-5-3-5 3z" />
    </svg>
  );
}
