import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { getServiceRoleKey } from "@/lib/supabase/env.server";

export function createAdminClient() {
  const env = getPublicSupabaseEnv();
  const key = getServiceRoleKey();

  if (!env || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(env.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}
