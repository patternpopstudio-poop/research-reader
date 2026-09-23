import { togglePublished } from "@/app/admin/actions";
import { BillingForm, CoverForm, InviteForm, PaperCopyForm, UploadForm } from "@/app/admin/forms";
import { getBillingSettings, isAdmin } from "@/lib/access";
import { PAPER_SELECT } from "@/lib/papers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessGrant, Invite, Paper } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    redirect("/papers");
  }

  const admin = createAdminClient();
  const { data: papers } = await admin.from("papers").select(PAPER_SELECT).order("title");
  const { data: invites } = await admin
    .from("invites")
    .select("id, email, paper_id, invited_by, expires_at, consumed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: grants } = await admin
    .from("access_grants")
    .select(
      "id, email, user_id, source, starts_at, expires_at, stripe_customer_id, stripe_checkout_session_id, confirmation_session_id, access_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const paperList = (papers ?? []) as Paper[];
  const inviteList = (invites ?? []) as Invite[];
  const grantList = (grants ?? []) as AccessGrant[];
  const paperTitle = Object.fromEntries(paperList.map((p) => [p.id, p.title]));
  const billing = await getBillingSettings();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-[var(--ink)]">Library admin</h1>
        <Link href="/papers" className="text-sm text-[var(--green)] hover:underline">
          View library
        </Link>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-serif text-xl">Invite a reader</h2>
          <p className="mt-1 mb-4 text-sm text-[var(--ink-muted)]">
            They sign in with that email and a password. The first sign-in sets the password. An
            all-papers invite also writes a library grant.
          </p>
          <InviteForm papers={paperList} />
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-serif text-xl">Upload PDF</h2>
          <p className="mt-1 mb-4 text-sm text-[var(--ink-muted)]">
            Files go to the private <code>papers</code> bucket. Readers never get a public URL.
          </p>
          <UploadForm papers={paperList} />
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-serif text-xl">Paper copy</h2>
          <p className="mt-1 mb-4 text-sm text-[var(--ink-muted)]">
            Description and lists shown on the public access portal.
          </p>
          <PaperCopyForm papers={paperList} />
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-serif text-xl">Cover image</h2>
          <p className="mt-1 mb-4 text-sm text-[var(--ink-muted)]">
            Optional JPEG, PNG, or WebP. Stored in the public <code>covers</code> bucket.
          </p>
          <CoverForm papers={paperList} />
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 md:col-span-2">
          <h2 className="font-serif text-xl">Subscription</h2>
          <p className="mt-1 mb-4 text-sm text-[var(--ink-muted)]">
            Price and duration for checkout. Stripe keys are unused until the paid path is wired.
          </p>
          <BillingForm settings={billing} />
        </section>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Papers</h2>
        <ul className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          {paperList.map((paper) => (
            <li key={paper.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{paper.title}</p>
                <p className="text-xs text-[var(--ink-muted)]">
                  /papers/{paper.slug}
                  {paper.storage_path ? ` · ${paper.storage_path}` : " · no PDF yet"}
                  {paper.cover_path ? ` · cover ${paper.cover_path}` : ""}
                  {paper.description ? " · has description" : ""}
                </p>
              </div>
              <form action={togglePublished}>
                <input type="hidden" name="paper_id" value={paper.id} />
                <input type="hidden" name="published" value={String(paper.published)} />
                <button type="submit" className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                  {paper.published ? "Published" : "Hidden"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Access grants</h2>
        <ul className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          {grantList.map((grant) => (
            <li key={grant.id} className="px-4 py-3 text-sm">
              <span className="font-medium">{grant.email}</span>
              <span className="text-[var(--ink-muted)]">
                {" "}
                · {grant.source} · {grant.access_id} ·{" "}
                {grant.expires_at
                  ? `expires ${new Date(grant.expires_at).toLocaleDateString()}`
                  : "no expiry"}
              </span>
            </li>
          ))}
          {grantList.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--ink-muted)]">No grants yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Recent invites</h2>
        <ul className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          {inviteList.map((invite) => (
            <li key={invite.id} className="px-4 py-3 text-sm">
              <span className="font-medium">{invite.email}</span>
              <span className="text-[var(--ink-muted)]">
                {" "}
                · {invite.paper_id ? paperTitle[invite.paper_id] ?? "one paper" : "all papers"} · expires{" "}
                {new Date(invite.expires_at).toLocaleDateString()}
                {invite.consumed_at ? " · signed in" : ""}
              </span>
            </li>
          ))}
          {inviteList.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--ink-muted)]">No invites yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
