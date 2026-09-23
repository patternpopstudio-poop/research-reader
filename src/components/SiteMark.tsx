type Props = {
  className?: string;
};

export function SiteMark({ className = "h-8 w-8" }: Props) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g fill="currentColor">
        <rect x="13.25" y="2" width="5.5" height="28" rx="2.75" />
        <rect x="13.25" y="2" width="5.5" height="28" rx="2.75" transform="rotate(60 16 16)" />
        <rect x="13.25" y="2" width="5.5" height="28" rx="2.75" transform="rotate(120 16 16)" />
      </g>
    </svg>
  );
}
