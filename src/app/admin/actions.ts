"use server";

import { isAdmin, normalizeEmail } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Admin only");
  }
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createInvite(_prev: { message: string }, formData: FormData) {
  await requireAdmin();
  const email = normalizeEmail(String(formData.get("email") || ""));
  const paperId = String(formData.get("paper_id") || "") || null;
  const days = Number(formData.get("days") || 30);

  if (!email.includes("@")) {
    return { message: "Enter a valid email." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const expires = new Date();
  expires.setDate(expires.getDate() + (Number.isFinite(days) ? days : 30));
  const expiresAt = expires.toISOString();

  const { error } = await admin.from("invites").insert({
    email,
    paper_id: paperId,
    invited_by: user?.id ?? null,
    expires_at: expiresAt,
  });

  if (error) {
    return { message: error.message.includes("duplicate") ? "That invite already exists." : error.message };
  }

  if (!paperId) {
    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    const { data: existingGrant } = await admin
      .from("access_grants")
      .select("id")
      .eq("source", "invite")
      .ilike("email", email)
      .maybeSingle();

    const grant = {
      email,
      user_id: profile?.id ?? null,
      source: "invite" as const,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    if (existingGrant) {
      await admin.from("access_grants").update(grant).eq("id", existingGrant.id);
    } else {
      await admin.from("access_grants").insert(grant);
    }
  }

  revalidatePath("/admin");
  return { message: `Invite saved for ${email}. They can request a magic link on the login page.` };
}

export async function uploadPaper(_prev: { message: string }, formData: FormData) {
  await requireAdmin();
  const paperId = String(formData.get("paper_id") || "");
  const file = formData.get("file");

  if (!paperId || !(file instanceof File) || file.size === 0) {
    return { message: "Choose a paper and a PDF file." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { message: "Only PDF files are accepted." };
  }

  const admin = createAdminClient();
  const { data: paper } = await admin.from("papers").select("id, slug").eq("id", paperId).maybeSingle();
  if (!paper) return { message: "Paper not found." };

  const path = `${paper.slug}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("papers").upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) return { message: uploadError.message };

  const { error: updateError } = await admin
    .from("papers")
    .update({ storage_path: path })
    .eq("id", paper.id);

  if (updateError) return { message: updateError.message };

  revalidatePath("/");
  revalidatePath("/papers");
  revalidatePath("/admin");
  revalidatePath("/upload");
  revalidatePath(`/papers/${paper.slug}`);
  revalidatePath(`/papers/${paper.slug}/read`);
  return { message: `Uploaded ${path}.` };
}

export async function uploadCover(_prev: { message: string }, formData: FormData) {
  await requireAdmin();
  const paperId = String(formData.get("paper_id") || "");
  const file = formData.get("file");

  if (!paperId || !(file instanceof File) || file.size === 0) {
    return { message: "Choose a paper and a cover image." };
  }

  const type = file.type;
  const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
  if (!allowed.includes(type as (typeof allowed)[number])) {
    return { message: "Cover must be a JPEG, PNG, or WebP image." };
  }

  const admin = createAdminClient();
  const { data: paper } = await admin.from("papers").select("id, slug").eq("id", paperId).maybeSingle();
  if (!paper) return { message: "Paper not found." };

  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `${paper.slug}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("covers").upload(path, buffer, {
    contentType: type,
    upsert: true,
  });

  if (uploadError) return { message: uploadError.message };

  const { error: updateError } = await admin.from("papers").update({ cover_path: path }).eq("id", paper.id);
  if (updateError) return { message: updateError.message };

  revalidatePath("/admin");
  revalidatePath(`/papers/${paper.slug}`);
  revalidatePath(`/papers/${paper.slug}/read`);
  return { message: `Cover uploaded as ${path}.` };
}

export async function updatePaperCopy(_prev: { message: string }, formData: FormData) {
  await requireAdmin();
  const paperId = String(formData.get("paper_id") || "");
  if (!paperId) return { message: "Choose a paper." };

  const admin = createAdminClient();
  const { data: paper } = await admin.from("papers").select("id, slug").eq("id", paperId).maybeSingle();
  if (!paper) return { message: "Paper not found." };

  const { error } = await admin
    .from("papers")
    .update({
      description: String(formData.get("description") || "").trim() || null,
      contents: parseLines(formData.get("contents")),
      highlights: parseLines(formData.get("highlights")),
    })
    .eq("id", paper.id);

  if (error) return { message: error.message };

  revalidatePath("/admin");
  revalidatePath(`/papers/${paper.slug}`);
  revalidatePath(`/papers/${paper.slug}/read`);
  return { message: "Paper copy saved." };
}

export async function updateBilling(_prev: { message: string }, formData: FormData) {
  await requireAdmin();

  const amount = Number(formData.get("price") || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return { message: "Enter a valid price." };
  }

  const interval = String(formData.get("interval") || "year");
  if (interval !== "year" && interval !== "month") {
    return { message: "Interval must be year or month." };
  }

  const currency = String(formData.get("currency") || "INR")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { message: "Currency must be a 3-letter code (for example INR)." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("billing_settings").upsert({
    id: 1,
    price_cents: Math.round(amount * 100),
    currency,
    billing_interval: interval,
    included_copy:
      String(formData.get("included_copy") || "").trim() ||
      "This document and future research from the practice for the subscription period.",
    support_email: String(formData.get("support_email") || "").trim() || null,
    company_name: String(formData.get("company_name") || "").trim() || "Dr. Prathiba Reddy",
    updated_at: new Date().toISOString(),
  });

  if (error) return { message: error.message };

  revalidatePath("/admin");
  return { message: "Billing settings saved." };
}

export async function togglePublished(formData: FormData) {
  await requireAdmin();
  const paperId = String(formData.get("paper_id") || "");
  const published = String(formData.get("published") || "") === "true";
  const admin = createAdminClient();
  await admin.from("papers").update({ published: !published }).eq("id", paperId);
  revalidatePath("/admin");
}
