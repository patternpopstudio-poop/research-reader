import { UploadForm } from "@/app/admin/forms";
import { isAdmin } from "@/lib/access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UploadPage() {
  if (!(await isAdmin())) redirect("/");

  const papers = await listUploadPapers();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex flex-col border-b border-[var(--line)] bg-white px-3 py-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-5">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Library">
          <SideLink href="/">All Research</SideLink>
          <SideLink href="/">My Library</SideLink>
          <SideLink href="/">Favourites</SideLink>
          <SideLink href="/upload" current>
            Upload PDF
          </SideLink>
        </nav>
        <a
          href="/#help"
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] lg:mt-auto"
        >
          Help & Support
        </a>
      </aside>
      <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-8">
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Upload a PDF</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            Choose a topic, then one of its papers. The PDF is stored on that paper and shows up under the same topic
            in the library.
          </p>
          <div className="mt-5">
            <UploadForm papers={papers} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SideLink({
  href,
  current = false,
  children,
}: {
  href: string;
  current?: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-xl px-3 py-2 text-sm ${
        current
          ? "bg-[#f0f5e4] font-medium text-[var(--ink)]"
          : "text-[var(--ink-muted)] hover:bg-[#f7faf2] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </Link>
  );
}

async function listUploadPapers() {
  const admin = tryCreateAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("papers").select("id, slug, title, storage_path").order("title");
  return (data as { id: string; slug: string; title: string; storage_path: string | null }[] | null) ?? [];
}
