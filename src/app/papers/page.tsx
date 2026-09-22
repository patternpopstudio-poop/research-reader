import { getSessionUser, listAccessiblePapers } from "@/lib/access";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PapersIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/papers");

  const papers = await listAccessiblePapers();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--green)]">
        Peer-reviewed research
      </p>
      <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">From the practice</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
        Signed in as {user.email}. Papers open in a read-only viewer — no download, copy, or print.
      </p>
      <ul className="mt-10 flex flex-col gap-3">
        {papers.map((paper) => (
          <li key={paper.id}>
            <Link
              href={`/papers/${paper.slug}/read`}
              className="block rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-5 py-4 transition hover:border-[var(--green)]"
            >
              <p className="font-serif text-xl text-[var(--ink)]">{paper.title}</p>
              {paper.subtitle ? (
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{paper.subtitle}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {papers.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--ink-muted)]">
          No papers are available for this invite yet.
        </p>
      ) : null}
    </div>
  );
}
