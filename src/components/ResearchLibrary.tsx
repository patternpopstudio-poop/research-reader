import { LibraryBrowser, type LibraryCard } from "@/components/LibraryBrowser";
import { getSessionUser, isAdmin, listAccessiblePapers, listPublishedPapers } from "@/lib/access";
import { formatPublishedMonth, getPaperPresentation, paperTopic, presentationSortTime } from "@/lib/paper-presentation";
import { publicCoverUrl } from "@/lib/papers";
import type { Paper } from "@/lib/types";

export async function ResearchLibrary() {
  let email: string | null = null;
  try {
    email = (await getSessionUser())?.email ?? null;
  } catch {
    email = null;
  }

  const catalog = await listPublishedPapers();
  const readable = email ? await listAccessiblePapers() : [];
  const readableSlugs = new Set(readable.map((paper) => paper.slug));
  const cards = catalog.map((paper) => toCard(paper, readableSlugs));
  const newest = cards.reduce((latest, card) => Math.max(latest, card.sortAt), 0);
  const newestIndex = cards.findIndex((card) => newest > 0 && card.sortAt === newest);
  const withNew = cards.map((card, index) => ({ ...card, isNew: index === newestIndex }));
  const readableCards = withNew.filter((card) => readableSlugs.has(card.slug));
  const canUpload = Boolean(email) && (await isAdmin());

  return <LibraryBrowser catalog={withNew} library={readableCards} email={email} canUpload={canUpload} />;
}

function toCard(paper: Paper, readableSlugs: Set<string>): LibraryCard {
  const presentation = getPaperPresentation(paper.slug);
  const readable = readableSlugs.has(paper.slug);
  const sortAt = presentationSortTime(paper.slug, paper.created_at);
  return {
    id: paper.id,
    slug: paper.slug,
    title: paper.title,
    subtitle: paper.subtitle,
    coverUrl: publicCoverUrl(paper.cover_path),
    published: formatPublishedMonth(presentation?.publishedOn ?? paper.created_at),
    sortAt,
    topic: paperTopic(paper.slug),
    pages: presentation?.pages ?? null,
    isNew: false,
    readable,
    href: readable ? `/papers/${paper.slug}/read` : `/papers/${paper.slug}`,
  };
}
