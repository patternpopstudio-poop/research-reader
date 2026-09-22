import { CLINIC_PAPER_LINKS } from "@/lib/clinic-papers";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { BillingSettings, Paper } from "@/lib/types";

export const PAPER_SELECT =
  "id, slug, title, subtitle, description, cover_path, contents, highlights, storage_path, published, created_at";

export const DEFAULT_CONTENTS = [
  "Full research document in a secure reader",
  "No download, copy, or print",
  "This document and future research from the practice during your access period",
];

export async function getPaperBySlug(slug: string): Promise<Paper | null> {
  const admin = tryCreateAdminClient();
  if (admin) {
    const { data } = await admin.from("papers").select(PAPER_SELECT).eq("slug", slug).maybeSingle();
    return (data as Paper | null) ?? null;
  }

  const clinic = CLINIC_PAPER_LINKS.find((paper) => paper.slug === slug);
  if (!clinic) return null;

  return {
    id: slug,
    slug,
    title: clinic.title,
    subtitle: null,
    description: null,
    cover_path: null,
    contents: [],
    highlights: [],
    storage_path: null,
    published: true,
    created_at: new Date().toISOString(),
  };
}

export function publicCoverUrl(coverPath: string | null) {
  const env = getPublicSupabaseEnv();
  if (!coverPath || !env) return null;
  return `${env.url.replace(/\/$/, "")}/storage/v1/object/public/covers/${encodeURIComponent(coverPath)}`;
}

export function formatPrice(settings: BillingSettings | null) {
  if (!settings || settings.price_cents <= 0) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency || "INR",
      maximumFractionDigits: 0,
    }).format(settings.price_cents / 100);
  } catch {
    return `${(settings.price_cents / 100).toFixed(0)} ${settings.currency}`;
  }
}

export function formatAccessPeriod(settings: BillingSettings | null) {
  if (!settings) return "Access period set by the practice";
  return settings.billing_interval === "month" ? "1 month of library access" : "12 months of library access";
}
