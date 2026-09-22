import { getPublicSupabaseEnv } from "@/lib/supabase/env";

function isPlaceholder(value: string) {
  return /YOUR_PROJECT|your-anon-key|your-service-role-key/i.test(value);
}

/** Node-only. Do not import this module from proxy.ts or Client Components. */
export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || isPlaceholder(key)) return null;
  return key;
}

export function missingSupabaseEnvNames() {
  const missing: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || isPlaceholder(url)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey || isPlaceholder(anonKey)) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!getServiceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function isSupabaseConfigured() {
  return Boolean(getPublicSupabaseEnv() && getServiceRoleKey());
}
