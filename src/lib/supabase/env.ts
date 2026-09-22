function isPlaceholder(value: string) {
  return /YOUR_PROJECT|your-anon-key|your-service-role-key/i.test(value);
}

export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || isPlaceholder(url) || isPlaceholder(anonKey)) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { url, anonKey };
}
