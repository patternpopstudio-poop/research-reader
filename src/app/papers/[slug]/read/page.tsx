import { DocumentLimitScreen } from "@/components/LimitReachedModal";
import { PdfViewer } from "@/components/PdfViewer";
import { getActiveGrant, getBillingSettings, getSessionUser, isAdmin } from "@/lib/access";
import { FREE_PAGE_LIMIT, openReaderAccess } from "@/lib/free-access";
import { getPaperBySlug } from "@/lib/papers";
import { formatLicenseWatermark } from "@/lib/watermark";
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

  const access = await openReaderAccess(paper as Paper, user.email, user.id);
  if (access === "none") redirect(`/papers/${slug}?access=none`);

  const [grant, billing] = await Promise.all([getActiveGrant(user.email), getBillingSettings()]);
  const watermark = formatLicenseWatermark({
    email: user.email,
    accessId: grant?.access_id ?? null,
    companyName: billing?.company_name,
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-2 text-xs text-[var(--ink-muted)]">
        <Link href="/papers" className="hover:underline">
          ← Back to Research Library
        </Link>
        <Link href={`/papers/${paper.slug}`} className="hover:underline">
          Paper details
        </Link>
      </div>
      {access === "limited" ? (
        <DocumentLimitScreen email={user.email} />
      ) : (
        <PdfViewer
          slug={paper.slug}
          title={paper.title}
          watermark={watermark}
          email={user.email}
          previewPageLimit={access === "preview" ? FREE_PAGE_LIMIT : undefined}
        />
      )}
    </div>
  );
}
