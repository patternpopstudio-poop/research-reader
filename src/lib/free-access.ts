import { emailHasAccess, isAdmin } from "@/lib/access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { Paper } from "@/lib/types";

export const FREE_PAGE_LIMIT = 2;
export const FREE_DOCUMENT_LIMIT = 3;

export type ReaderAccess = "full" | "preview" | "limited" | "none";

export async function openReaderAccess(paper: Paper, email: string, userId: string): Promise<ReaderAccess> {
  if (await isAdmin()) return "full";
  if (!paper.published) return "none";
  if (await emailHasAccess(email, paper.id)) return "full";
  return claimFreePreview(userId, paper.slug);
}

export async function freePreviewIsOpen(userId: string, slug: string) {
  const slugs = await previewSlugs(userId);
  return Boolean(slugs?.includes(slug));
}

async function claimFreePreview(userId: string, slug: string): Promise<"preview" | "limited" | "none"> {
  const current = await previewSlugs(userId);
  if (!current) return "none";
  if (current.includes(slug)) return "preview";
  if (current.length >= FREE_DOCUMENT_LIMIT) return "limited";

  const admin = tryCreateAdminClient();
  if (!admin) return "none";
  const { data, error: readError } = await admin.auth.admin.getUserById(userId);
  if (readError || !data.user) return "none";

  const next = [...current, slug];
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user.app_metadata, free_preview_slugs: next },
  });
  if (error) return "none";
  return "preview";
}

async function previewSlugs(userId: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  const raw = data.user.app_metadata?.free_preview_slugs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((slug): slug is string => typeof slug === "string");
}
