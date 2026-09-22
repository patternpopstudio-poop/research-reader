import { canReadPaper, getSessionUser, isAdmin } from "@/lib/access";
import { getPaperBySlug } from "@/lib/papers";
import { PdfViewer } from "@/components/PdfViewer";
import type { Paper } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  if (!paper) return { title: "Reader" };
  return { title: `Read · ${paper.title}` };
}

export default async function PaperReadPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user?.email) redirect(`/login?next=/papers/${slug}/read`);

  const paper = await getPaperBySlug(slug);
  if (!paper) notFound();

  const adminUser = await isAdmin();
  if (!paper.published && !adminUser) notFound();

  const allowed = await canReadPaper(paper as Paper, user.email);
  if (!allowed) redirect(`/papers/${slug}?access=none`);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-4 py-2 text-xs text-[var(--ink-muted)]">
        <Link href="/papers" className="hover:underline">
          ← Back to Research Library
        </Link>
        <Link href={`/papers/${paper.slug}`} className="hover:underline">
          Paper details
        </Link>
      </div>
      <PdfViewer slug={paper.slug} title={paper.title} watermark={user.email} />
    </div>
  );
}
