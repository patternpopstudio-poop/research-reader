import { LoginForm } from "@/components/LoginForm";
import { CLINIC_PAPER_LINKS } from "@/lib/clinic-papers";
import { isSupabaseConfigured, missingSupabaseEnvNames } from "@/lib/supabase/env.server";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 lg:flex-row lg:items-start">
      <section className="flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
          Peer-reviewed research from the practice
        </p>
        <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
          Read the papers. Nothing leaves the page.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[var(--ink-muted)]">
          This library is invitation-only. After you sign in with a magic link, papers open in a
          viewer that does not offer download, copy, or print. Watermarks identify the invited
          reader.
        </p>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--ink-muted)]">
          Clinic site cards at prathibareddythodima.com should point here — for example{" "}
          <code className="text-xs">/papers/allergy-blueprint</code>.
        </p>
        <ul className="mt-8 grid gap-2 text-sm text-[var(--ink-muted)] sm:grid-cols-2">
          {CLINIC_PAPER_LINKS.map((paper) => (
            <li key={paper.slug}>{paper.title}</li>
          ))}
        </ul>
      </section>
      <aside className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-sm">
        <h2 className="font-serif text-2xl">Request access</h2>
        <p className="mt-2 mb-6 text-sm text-[var(--ink-muted)]">
          Use the email that was invited. You will receive a one-time sign-in link.
        </p>
        {!isSupabaseConfigured() ? (
          <p className="mb-4 text-sm text-red-800">
            Supabase keys are missing ({missingSupabaseEnvNames().join(", ")}). Copy{" "}
            <code>.env.example</code> to <code>.env.local</code>, add your project URL and API keys,
            then restart <code>npm run dev</code>.
          </p>
        ) : null}
        <LoginForm nextPath="/papers" />
      </aside>
    </div>
  );
}
