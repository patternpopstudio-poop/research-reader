type Props = {
  className?: string;
};

export function PdfCover({ className = "" }: Props) {
  return (
    <div
      className={`relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f7f8fa,#eef1f6)] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 84 120" className="h-[74%] w-auto drop-shadow-[0_10px_18px_rgba(27,36,48,0.14)]">
        <path
          d="M16 1h38.5L83 29.5V104a15 15 0 0 1-15 15H16A15 15 0 0 1 1 104V16A15 15 0 0 1 16 1z"
          fill="#fff"
          stroke="#e6ebf2"
          strokeWidth="1"
        />
        <path d="M54.5 1.5 82.2 29.2H62a7.5 7.5 0 0 1-7.5-7.5V1.5z" fill="#f3f5f8" />
        <path d="M18 46h26" fill="none" stroke="#9aa8ba" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M18 58h46M18 68h40M18 78h46M18 88h32M18 98h22"
          fill="none"
          stroke="#d5dce6"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
