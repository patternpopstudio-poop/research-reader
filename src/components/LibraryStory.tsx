import { SiteMark } from "@/components/SiteMark";
import Link from "next/link";

const FEATURES = [
  {
    title: "Evidence-based research",
    detail: "Reliable, peer-reviewed content",
    icon: <BookIcon />,
  },
  {
    title: "Curated by clinicians",
    detail: "Practical guides from the practice",
    icon: <PeopleIcon />,
  },
  {
    title: "Secure access",
    detail: "Sign in with your email and password",
    icon: <ShieldIcon />,
  },
  {
    title: "Read-only viewer",
    detail: "No download, copy, or print",
    icon: <EyeIcon />,
  },
] as const;

type Props = {
  showMark?: boolean;
  pinnedQuote?: boolean;
};

export function LibraryStory({ showMark = false, pinnedQuote = false }: Props) {
  return (
    <div className="relative flex flex-1 flex-col">
      {showMark ? (
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <SiteMark className="h-8 w-8 text-[var(--green)]" />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-base text-[var(--ink)]">Dr. Prathiba Reddy</span>
            <span className="text-xs text-[var(--ink-muted)]">Research Library</span>
          </span>
        </Link>
      ) : null}
      <div className={showMark ? "mt-12 lg:mt-16" : undefined}>
        <h1 className="max-w-md font-serif text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
          Trusted research for better care
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-[var(--ink-muted)]">
          Access peer-reviewed research and practical guides from the practice. Sign in with your email
          and password, then read in a viewer that does not offer download, copy, or print.
        </p>
        <ul className="mt-8 max-w-md space-y-5">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--green)]">
                {feature.icon}
              </span>
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">{feature.title}</span>
                <span className="block text-sm text-[var(--ink-muted)]">{feature.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <blockquote className={pinnedQuote ? "mt-12 max-w-md lg:mt-auto lg:pt-16" : "mt-12 max-w-md"}>
        <p className="font-serif text-lg leading-7 text-[var(--ink)]">
          “Peer-reviewed research, read in the browser. Nothing leaves the page.”
        </p>
        <footer className="mt-3 text-sm text-[var(--ink-muted)]">— Dr. Prathiba Reddy</footer>
      </blockquote>
    </div>
  );
}

function BookIcon() {
  return <StrokeIcon path="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5zM5 19.2A2.5 2.5 0 0 1 7.5 17H19" />;
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4.5 18.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4" />
      <path d="M13.5 14.6c1.4-.4 2.6-.2 3.6.6 1 .8 1.6 2 1.9 3.3" />
    </svg>
  );
}

function ShieldIcon() {
  return <StrokeIcon path="M12 3.5l7 2.5v6.2c0 4.2-2.8 7.2-7 8.3-4.2-1.1-7-4.1-7-8.3V6l7-2.5z" />;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function StrokeIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
