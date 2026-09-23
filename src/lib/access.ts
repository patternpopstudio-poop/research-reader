import { PAPER_SELECT } from "@/lib/papers";
import type { AccessGrant, BillingSettings, Paper, Profile } from "@/lib/types";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { tryCreateClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await tryCreateClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("id, email, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function linkGrantsToUser(userId: string, email: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return;
  await admin
    .from("access_grants")
    .update({ user_id: userId })
    .ilike("email", normalizeEmail(email))
    .is("user_id", null);
}

export function configuredAdminEmails() {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

export function configuredAdminEmail() {
  return configuredAdminEmails()[0] ?? null;
}

export function isConfiguredAdminEmail(email: string) {
  return configuredAdminEmails().includes(normalizeEmail(email));
}

async function promoteConfiguredAdmin(userId: string, email: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return;
  await admin.from("profiles").upsert(
    { id: userId, email: normalizeEmail(email), role: "admin" },
    { onConflict: "id" },
  );
}

export async function isAdmin() {
  const profile = await getProfile();
  if (profile?.role === "admin") return true;

  const user = await getSessionUser();
  if (!user?.email || !isConfiguredAdminEmail(user.email)) return false;
  await promoteConfiguredAdmin(user.id, user.email);
  return true;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUnexpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

export async function emailIsInvited(email: string, paperId?: string | null) {
  const admin = tryCreateAdminClient();
  if (!admin) return false;
  const normalized = normalizeEmail(email);

  const { data, error } = await admin
    .from("invites")
    .select("id, paper_id, expires_at")
    .ilike("email", normalized);

  if (error || !data) return false;

  return data.some((invite) => {
    if (!isUnexpired(invite.expires_at)) return false;
    if (invite.paper_id === null) return true;
    if (!paperId) return true;
    return invite.paper_id === paperId;
  });
}

export async function getActiveGrant(email: string): Promise<AccessGrant | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("access_grants")
    .select(
      "id, email, user_id, source, starts_at, expires_at, stripe_customer_id, stripe_checkout_session_id, confirmation_session_id, access_id, created_at",
    )
    .ilike("email", normalizeEmail(email));

  if (error || !data) return null;

  const now = Date.now();
  const active = (data as AccessGrant[]).find((grant) => {
    if (new Date(grant.starts_at).getTime() > now) return false;
    return isUnexpired(grant.expires_at);
  });

  return active ?? null;
}

export async function emailHasAccess(email: string, paperId?: string | null) {
  if (isConfiguredAdminEmail(email)) return true;
  if (await getActiveGrant(email)) return true;
  return emailIsInvited(email, paperId);
}

export async function canReadPaper(paper: Paper, email: string | undefined) {
  if (await isAdmin()) return true;
  if (!email || !paper.published) return false;
  return emailHasAccess(email, paper.id);
}

export async function listPublishedPapers() {
  const admin = tryCreateAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("papers").select(PAPER_SELECT).eq("published", true).order("title");
  return (data as Paper[] | null) ?? [];
}

export async function listAccessiblePapers() {
  const user = await getSessionUser();
  if (!user?.email) return [];

  const papers = await listPublishedPapers();
  if (papers.length === 0) return [];

  const adminUser = await isAdmin();
  if (adminUser) return papers;

  if (await getActiveGrant(user.email)) return papers;

  const allowed: Paper[] = [];
  for (const paper of papers) {
    if (await emailIsInvited(user.email, paper.id)) allowed.push(paper);
  }
  return allowed;
}

export async function getBillingSettings(): Promise<BillingSettings | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("billing_settings").select("*").eq("id", 1).maybeSingle();
  return (data as BillingSettings | null) ?? null;
}
