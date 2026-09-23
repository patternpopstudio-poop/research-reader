import { getBillingSettings, normalizeEmail } from "@/lib/access";
import {
  assertConfirmationEmailConfigured,
  formatCheckoutAmount,
  sendPurchaseConfirmation,
} from "@/lib/confirmation-email";
import { sendAccessLink } from "@/lib/magic-link";
import { formatAccessPeriod, getPaperBySlug } from "@/lib/papers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Stripe } from "stripe";
import { getStripe } from "@/lib/stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

function laterIso(a: string | null | undefined, b: string) {
  if (!a) return b;
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}

export function grantExpiresAt(interval: "year" | "month", from = new Date()) {
  const date = new Date(from);
  if (interval === "month") date.setMonth(date.getMonth() + 1);
  else date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const root = subscription as Stripe.Subscription & { current_period_end?: number };
  if (typeof root.current_period_end === "number") {
    return new Date(root.current_period_end * 1000);
  }
  const item = subscription.items?.data?.[0] as { current_period_end?: number } | undefined;
  if (item && typeof item.current_period_end === "number") {
    return new Date(item.current_period_end * 1000);
  }
  return null;
}

const GRANT_FULFILL_SELECT = "id, expires_at, confirmation_session_id, stripe_checkout_session_id";

type FulfilledGrant = {
  id: string;
  expires_at: string | null;
  confirmation_session_id: string | null;
  stripe_checkout_session_id: string | null;
};

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const email = normalizeEmail(
    session.customer_email || session.customer_details?.email || session.metadata?.email || "",
  );
  if (!email.includes("@")) {
    throw new Error("Checkout session is missing a customer email.");
  }

  const admin = createAdminClient();
  const { data: bySession, error: lookupError } = await admin
    .from("access_grants")
    .select(GRANT_FULFILL_SELECT)
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const existing = bySession as FulfilledGrant | null;
  if (existing?.confirmation_session_id === session.id) {
    return { email, reused: true };
  }

  const grant = existing ?? (await upsertPurchaseGrant(admin, session, email));
  await deliverPurchaseEmails(session, email, grant.expires_at);

  const { error: markError } = await admin
    .from("access_grants")
    .update({ confirmation_session_id: session.id })
    .eq("id", grant.id);
  if (markError) throw new Error(markError.message);

  return { email, reused: Boolean(existing) };
}

async function upsertPurchaseGrant(admin: SupabaseClient, session: Stripe.Checkout.Session, email: string) {
  const billing = await getBillingSettings();
  const interval =
    session.metadata?.billing_interval === "month" || billing?.billing_interval === "month" ? "month" : "year";
  let expiresAt = grantExpiresAt(interval);
  const stripe = getStripe();

  if (session.mode === "subscription" && session.subscription && stripe) {
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = subscriptionPeriodEnd(subscription);
    if (periodEnd) expiresAt = periodEnd.toISOString();
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  const { data: existingPurchase, error: existingError } = await admin
    .from("access_grants")
    .select("id, expires_at")
    .eq("source", "purchase")
    .ilike("email", email)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const payload = {
    email,
    user_id: profile?.id ?? null,
    source: "purchase" as const,
    starts_at: new Date().toISOString(),
    expires_at: existingPurchase ? laterIso(existingPurchase.expires_at, expiresAt) : expiresAt,
    stripe_customer_id: customerId,
    stripe_checkout_session_id: session.id,
  };

  if (existingPurchase) {
    const { error } = await admin.from("access_grants").update(payload).eq("id", existingPurchase.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("access_grants").insert(payload);
    if (error) {
      const duplicate = error.message.toLowerCase().includes("duplicate") || error.code === "23505";
      if (!duplicate) throw new Error(error.message);
      const { error: updateError } = await admin
        .from("access_grants")
        .update(payload)
        .eq("source", "purchase")
        .ilike("email", email);
      if (updateError) throw new Error(updateError.message);
    }
  }

  const { data: grant, error: grantError } = await admin
    .from("access_grants")
    .select(GRANT_FULFILL_SELECT)
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (grantError) throw new Error(grantError.message);
  if (!grant) throw new Error("Purchase grant was not saved.");
  return grant as FulfilledGrant;
}

async function deliverPurchaseEmails(session: Stripe.Checkout.Session, email: string, expiresAt: string | null) {
  assertConfirmationEmailConfigured();

  const slug = session.metadata?.paper_slug?.trim() || "";
  const accessPath = slug ? `/papers/${slug}/read` : "/papers";
  const link = await sendAccessLink(email, accessPath, { requireAccess: false });
  if (!link.ok) throw new Error(link.message);

  const billing = await getBillingSettings();
  const paper = slug ? await getPaperBySlug(slug) : null;
  const name = session.customer_details?.name?.trim() || null;

  await sendPurchaseConfirmation({
    to: email,
    name,
    documentTitle: paper?.title || "Research library",
    periodLabel: formatAccessPeriod(billing),
    expiresAt,
    amountLabel: formatCheckoutAmount(session.amount_total, session.currency),
    supportEmail: billing?.support_email ?? null,
    companyName: billing?.company_name || "Dr. Prathiba Reddy",
    accessPath,
  });
}

export async function grantForCheckoutSession(sessionId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("access_grants")
    .select(
      "id, email, user_id, source, starts_at, expires_at, stripe_customer_id, stripe_checkout_session_id, confirmation_session_id, access_id, created_at",
    )
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return data;
}
