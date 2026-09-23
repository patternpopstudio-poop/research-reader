import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const env = getPublicSupabaseEnv();
  if (!env) {
    return supabaseResponse;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const paperSegments = pathname.split("/").filter(Boolean);
  const isPublicPaperPortal = paperSegments.length === 2 && paperSegments[0] === "papers";
  const isPublicUnlocked =
    paperSegments.length === 3 && paperSegments[0] === "papers" && paperSegments[2] === "unlocked";
  const isPapersIndex = pathname === "/papers";
  const isProtected =
    !isPublicPaperPortal &&
    !isPublicUnlocked &&
    !isPapersIndex &&
    (pathname.startsWith("/papers/") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/upload") ||
      pathname.startsWith("/api/papers"));

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next") || "/";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next.startsWith("/") ? next : "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/login", "/papers/:path*", "/admin/:path*", "/upload", "/api/papers/:path*"],
};
