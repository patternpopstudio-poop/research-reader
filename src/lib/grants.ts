import { getBillingSettings, normalizeEmail } from "@/lib/access";
import { sendAccessLink } from "@/lib/magic-link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Stripe } from "stripe";
import { getStripe } from "@/lib/stripe";

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

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const email = normalizeEmail(
    session.customer_email || session.customer_details?.email || session.metadata?.email || "",
  );
  if (!email.includes("@")) {
    throw new Error("Checkout session is missing a customer email.");
  }

  const admin = createAdminClient();
  const { data: existingSession } = await admin
    .from("access_grants")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingSession) {
    return { email, reused: true };
  }

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
  const { data: existingPurchase } = await admin
    .from("access_grants")
    .select("id, expires_at")
    .eq("source", "purchase")
    .ilike("email", email)
    .maybeSingle();

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
      if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
        return { email, reused: true };
      }
      throw new Error(error.message);
    }
  }

  const slug = session.metadata?.paper_slug;
  const next = slug ? `/papers/${slug}/read` : "/papers";
  await sendAccessLink(email, next, { requireAccess: false });

  return { email, reused: false };
}

export async function grantForCheckoutSession(sessionId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("access_grants")
    .select(
      "id, email, user_id, source, starts_at, expires_at, stripe_customer_id, stripe_checkout_session_id, access_id, created_at",
    )
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return data;
}
