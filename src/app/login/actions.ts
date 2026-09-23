"use server";

import { emailHasAccess, isAdmin, isConfiguredAdminEmail, linkGrantsToUser, normalizeEmail } from "@/lib/access";
import { safeNextPath } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const initialFailure = { ok: false, message: "Email or password is incorrect." };

export async function signInWithEmailPassword(
  _prev: { ok: boolean; message: string },
  formData: FormData,
) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/"));

  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Use at least 8 characters for the password." };
  }

  const allowed = isConfiguredAdminEmail(email) || (await emailHasAccess(email));
  if (!allowed) return initialFailure;

  const supabase = await createClient();
  const existing = await supabase.auth.signInWithPassword({ email, password });
  if (!existing.error && existing.data.user) {
    await finishSignIn(existing.data.user.id, existing.data.user.email);
    redirect(next);
  }

  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) return initialFailure;

  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) {
    return { ok: false, message: "Could not sign in. Try again." };
  }

  await finishSignIn(signedIn.data.user.id, signedIn.data.user.email);
  redirect(next);
}

async function finishSignIn(userId: string, email: string | undefined) {
  if (email) await linkGrantsToUser(userId, email);
  await isAdmin();
}
