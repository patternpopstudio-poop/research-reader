export type PaperPresentation = {
  topic: string;
  pages?: number;
  publishedOn?: string;
  quote?: string;
  quoteBy?: string;
};

const PRESENTATION: Record<string, PaperPresentation> = {
  "allergy-blueprint": { topic: "Allergies" },
  "understanding-vertigo": { topic: "Vertigo" },
  "the-healthy-ear": { topic: "Ear health" },
  "clearer-breathing": { topic: "Respiratory" },
  "allergy-care-at-home": { topic: "Allergies" },
  "balance-and-recovery": { topic: "Vertigo" },
  "voice-health": { topic: "Voice" },
  "pediatric-ent-notes": { topic: "Children's health" },
  "sleep-and-breathing": { topic: "Sleep" },
  "clinical-research-digest": { topic: "Research" },
};

export function getPaperPresentation(slug: string) {
  return PRESENTATION[slug] ?? null;
}

export function paperTopic(slug: string) {
  return getPaperPresentation(slug)?.topic ?? "Research";
}

export const PAPER_TOPIC_NAMES = [...new Set(Object.values(PRESENTATION).map((item) => item.topic))].sort((a, b) =>
  a.localeCompare(b),
);

export function formatPublishedMonth(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

export function presentationSortTime(slug: string, createdAt: string) {
  const iso = getPaperPresentation(slug)?.publishedOn ?? createdAt;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}
