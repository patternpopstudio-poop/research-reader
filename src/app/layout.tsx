import { Source_Serif_4, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";
import "./globals.css";
import type { Metadata } from "next";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Research Library — Dr. Prathiba Reddy",
    template: "%s — Research Library",
  },
  description: "Invite-only read access to peer-reviewed research from the practice.",
  robots: { index: false, follow: false },
};

async function Header() {
  let email: string | null = null;
  let admin = false;
  try {
    const supabase = await tryCreateClient();
    if (!supabase) throw new Error("supabase unconfigured");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    try {
      if (user) admin = await isAdmin();
    } catch {
      admin = false;
    }
  } catch {
    email = null;
  }

  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-serif text-lg text-[var(--ink)]">
          Dr. Prathiba Reddy
          <span className="ml-2 text-sm font-sans text-[var(--ink-muted)]">Research Library</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <>
              <Link href="/papers" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                Papers
              </Link>
              {admin ? (
                <Link href="/admin" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  Admin
                </Link>
              ) : null}
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-[var(--green)]">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
