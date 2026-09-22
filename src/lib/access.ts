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

export async function isAdmin() {
  const profile = await getProfile();
  return profile?.role === "admin";
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
      "id, email, user_id, source, starts_at, expires_at, stripe_customer_id, stripe_checkout_session_id, access_id, created_at",
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
  if (await getActiveGrant(email)) return true;
  return emailIsInvited(email, paperId);
}

export async function canReadPaper(paper: Paper, email: string | undefined) {
  if (await isAdmin()) return true;
  if (!email || !paper.published) return false;
  return emailHasAccess(email, paper.id);
}

export async function listAccessiblePapers() {
  const user = await getSessionUser();
  if (!user?.email) return [];

  const admin = tryCreateAdminClient();
  if (!admin) return [];
  const { data: papers } = await admin
    .from("papers")
    .select(PAPER_SELECT)
    .eq("published", true)
    .order("title");

  if (!papers) return [];

  const adminUser = await isAdmin();
  if (adminUser) return papers as Paper[];

  if (await getActiveGrant(user.email)) return papers as Paper[];

  const allowed: Paper[] = [];
  for (const paper of papers as Paper[]) {
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
