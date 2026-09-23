"use server";

import { getBillingSettings, getSessionUser, normalizeEmail } from "@/lib/access";
import { LIBRARY_PLAN } from "@/lib/plan";
import { getPaperBySlug } from "@/lib/papers";
import { getSiteOrigin } from "@/lib/site";
import { getStripe, getStripePriceId } from "@/lib/stripe";
import { redirect } from "next/navigation";

export async function startCheckout(_prev: { message: string }, formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const user = await getSessionUser();
  const email = normalizeEmail(String(formData.get("email") || user?.email || ""));

  if (!email.includes("@")) {
    return { message: "Enter the email that should receive access." };
  }

  const paper = slug ? await getPaperBySlug(slug) : null;
  if (slug && !paper?.published) {
    return { message: "This research is not available for purchase." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { message: "Checkout is not configured yet. Ask the practice for an invite, then use Already have access." };
  }

  const billing = await getBillingSettings();
  const priceId = getStripePriceId();
  const origin = getSiteOrigin();
  const company = billing?.company_name || "Dr. Prathiba Reddy";
  const successPath = paper
    ? `/papers/${paper.slug}/unlocked?session_id={CHECKOUT_SESSION_ID}`
    : "/plans/confirmed?session_id={CHECKOUT_SESSION_ID}";
  const cancelPath = paper ? `/papers/${paper.slug}` : "/plans";

  let checkoutUrl: string;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      client_reference_id: email,
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}${cancelPath}`,
      metadata: {
        email,
        paper_slug: paper?.slug ?? "",
        billing_interval: LIBRARY_PLAN.interval,
      },
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              quantity: 1,
              price_data: {
                currency: LIBRARY_PLAN.currency,
                unit_amount: LIBRARY_PLAN.amountCents,
                recurring: { interval: LIBRARY_PLAN.interval },
                product_data: {
                  name: LIBRARY_PLAN.name,
                  description: paper
                    ? `${LIBRARY_PLAN.checkoutDescription} Includes ${paper.title} from ${company}.`
                    : LIBRARY_PLAN.checkoutDescription,
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
