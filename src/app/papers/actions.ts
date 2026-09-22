"use server";

import { getBillingSettings, getSessionUser, normalizeEmail } from "@/lib/access";
import { getPaperBySlug } from "@/lib/papers";
import { getSiteOrigin } from "@/lib/site";
import { getStripe, getStripePriceId } from "@/lib/stripe";
import { redirect } from "next/navigation";

export async function startCheckout(_prev: { message: string }, formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const user = await getSessionUser();
  const email = normalizeEmail(String(formData.get("email") || user?.email || ""));

  if (!email.includes("@")) {
    return { message: "Enter the email that should receive access." };
  }

  const paper = await getPaperBySlug(slug);
  if (!paper?.published) {
    return { message: "This research is not available for purchase." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { message: "Checkout is not configured yet. Ask the practice for an invite, then use Already have access." };
  }

  const billing = await getBillingSettings();
  const priceId = getStripePriceId();
  if (!priceId && (!billing || billing.price_cents <= 0)) {
    return { message: "A price has not been set. Ask the practice for an invite for now." };
  }

  const origin = getSiteOrigin();
  const company = billing?.company_name || "Dr. Prathiba Reddy";
  const interval = billing?.billing_interval === "month" ? "month" : "year";

  let checkoutUrl: string;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: priceId ? "subscription" : "payment",
      customer_email: email,
      client_reference_id: email,
      success_url: `${origin}/papers/${paper.slug}/unlocked?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/papers/${paper.slug}`,
      metadata: {
        email,
        paper_slug: paper.slug,
        billing_interval: interval,
      },
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              quantity: 1,
              price_data: {
                currency: (billing?.currency || "INR").toLowerCase(),
                unit_amount: billing!.price_cents,
                product_data: {
                  name: "Research library access",
                  description: `Includes ${paper.title} and future research from ${company}`,
                },
              },
            },
          ],
    });

    if (!session.url) {
      return { message: "Could not open checkout. Try again in a moment." };
    }
    checkoutUrl = session.url;
  } catch {
    return { message: "Could not open checkout. Try again in a moment." };
  }

  redirect(checkoutUrl);
}
