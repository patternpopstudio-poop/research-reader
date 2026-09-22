"use server";

import { normalizeEmail } from "@/lib/access";
import { sendAccessLink } from "@/lib/magic-link";
import { safeNextPath } from "@/lib/site";

export async function requestMagicLink(
  _prev: { ok: boolean; message: string },
  formData: FormData,
) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  const next = safeNextPath(String(formData.get("next") || "/papers"));
  const generic =
    "If this address is invited, a sign-in link is on its way. Check your inbox (and spam).";

  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const result = await sendAccessLink(email, next, { requireAccess: true });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return { ok: true, message: generic };
}
