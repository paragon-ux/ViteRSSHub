type BrandMarkProps = {
  size?: number;
  className?: string;
};

export default function BrandMark({
  size = 48,
  className,
}: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="brand-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F766E" />
          <stop offset="1" stopColor="#0B4F49" />
        </linearGradient>
        <linearGradient id="brand-sheen" x1="18" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ECFDF7" stopOpacity="0.44" />
          <stop offset="1" stopColor="#F7F3EC" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="brand-arc" x1="20" y1="18" x2="45" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7F3EC" />
          <stop offset="1" stopColor="#BEE6DA" />
        </linearGradient>
      </defs>

      <rect x="6" y="6" width="52" height="52" rx="18" fill="url(#brand-bg)" />
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="14"
        fill="url(#brand-sheen)"
        opacity="0.9"
      />

      <path
        d="M19 45.5c0-14.1 11.4-25.5 25.5-25.5"
        stroke="url(#brand-arc)"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M19 35.7c0-8.7 7-15.7 15.7-15.7"
        stroke="#F7F3EC"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <path
        d="M19 26c0-3.7 3-6.7 6.7-6.7"
        stroke="#CFEDE5"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <circle cx="19" cy="45.5" r="4.4" fill="#F7F3EC" />
      <circle cx="45" cy="20.2" r="3.3" fill="#CDECE5" />
    </svg>
  );
}
