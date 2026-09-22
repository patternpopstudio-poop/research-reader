import { canReadPaper, getSessionUser } from "@/lib/access";
import { PAPER_SELECT } from "@/lib/papers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Paper } from "@/lib/types";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const user = await getSessionUser();

  if (!user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: paper } = await admin
    .from("papers")
    .select(PAPER_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (!paper) {
    return new NextResponse("Not found", { status: 404 });
  }

  const allowed = await canReadPaper(paper as Paper, user.email);
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const typed = paper as Paper;
  if (!typed.storage_path) {
    return new NextResponse("Paper file not uploaded", { status: 404 });
  }

  const { data, error } = await admin.storage.from("papers").download(typed.storage_path);
  if (error || !data) {
    return new NextResponse("Paper file not uploaded", { status: 404 });
  }

  const buffer = await data.arrayBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${typed.slug}.pdf"`,
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const dynamic = "force-dynamic";
