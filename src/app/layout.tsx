import { Source_Serif_4, Source_Sans_3 } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
