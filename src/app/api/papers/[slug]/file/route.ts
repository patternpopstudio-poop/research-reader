import { canReadPaper, getSessionUser } from "@/lib/access";
import { freePreviewIsOpen } from "@/lib/free-access";
import { PAPER_SELECT } from "@/lib/papers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Paper } from "@/lib/types";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const destination = request.headers.get("sec-fetch-dest");
  const fromReader = request.headers.get("x-reader") === "1" && destination !== "document" && destination !== "iframe";
  if (!fromReader) {
    return new NextResponse("Not found", { status: 404 });
  }

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
  const preview = !allowed && paper.published && (await freePreviewIsOpen(user.id, slug));
  if (!allowed && !preview) {
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
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Download-Options": "noopen",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const dynamic = "force-dynamic";
