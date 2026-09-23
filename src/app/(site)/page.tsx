import { ResearchLibrary } from "@/components/ResearchLibrary";
import { isSupabaseConfigured, missingSupabaseEnvNames } from "@/lib/supabase/env.server";

type Props = {
  searchParams: Promise<{ view?: string; topic?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <>
      {!isSupabaseConfigured() ? (
        <p className="border-b border-[var(--line)] bg-red-50 px-6 py-3 text-sm text-red-800 lg:px-10">
          Supabase keys are missing ({missingSupabaseEnvNames().join(", ")}). Copy <code>.env.example</code> to{" "}
          <code>.env.local</code>, add your project URL and API keys, then restart <code>npm run dev</code>.
        </p>
      ) : null}
      <ResearchLibrary view={params.view ?? null} topic={params.topic ?? null} />
    </>
  );
}
