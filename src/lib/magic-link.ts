import { emailHasAccess, normalizeEmail } from "@/lib/access";
import { getSiteOrigin, safeNextPath } from "@/lib/site";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";

export async function sendAccessLink(email: string, nextPath: string, options?: { requireAccess?: boolean }) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) {
    return { ok: false as const, message: "Enter a valid email address." };
  }

  const requireAccess = options?.requireAccess ?? true;
  if (requireAccess && !(await emailHasAccess(normalized))) {
    return { ok: true as const, skipped: true as const };
  }

  const env = getPublicSupabaseEnv();
  if (!env) {
    return { ok: false as const, message: "Could not send the link. Try again in a moment." };
  }

  const next = safeNextPath(nextPath);
  const supabase = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    const limited = error.status === 429 || error.code === "over_email_send_rate_limit";
    return {
      ok: false as const,
      message: limited
        ? "Too many sign-in emails were just sent. Wait a minute, then request the link once."
        : "Could not send the link. Try again in a moment.",
    };
  }

  return { ok: true as const, skipped: false as const };
}
