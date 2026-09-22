import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured, missingSupabaseEnvNames } from "@/lib/supabase/env.server";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/papers";
  const portalMatch = nextPath.match(/^\/papers\/([^/]+)\/read\/?$/);
  const portalHref = portalMatch ? `/papers/${portalMatch[1]}` : "/";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
          Research library
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--ink)]">Sign in to read</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Enter the email that already has access. We will send a one-time sign-in link. If this
          address is not on an invite or purchase, you will not receive mail — you can purchase
          access from the research page instead.
        </p>
        {params.error ? (
          <p className="mt-4 text-sm text-red-800">The sign-in link was invalid or expired.</p>
        ) : null}
        {!isSupabaseConfigured() ? (
          <p className="mt-4 text-sm text-red-800">
            Supabase keys are missing ({missingSupabaseEnvNames().join(", ")}). Copy{" "}
            <code>.env.example</code> to <code>.env.local</code>, add your project URL and API keys,
            then restart <code>npm run dev</code>.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
        <p className="mt-6 text-center text-xs text-[var(--ink-muted)]">
          <Link href={portalHref} className="underline-offset-2 hover:underline">
            {portalMatch ? "Back to this research" : "Back to the library"}
          </Link>
        </p>
      </div>
    </div>
  );
}
