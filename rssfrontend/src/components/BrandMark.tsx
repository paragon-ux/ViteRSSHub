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
        <linearGradient id="brand-bg" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F766E" />
          <stop offset="1" stopColor="#155E57" />
        </linearGradient>
        <linearGradient id="brand-sheen" x1="18" y1="14" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7F3EC" stopOpacity="0.42" />
          <stop offset="1" stopColor="#F7F3EC" stopOpacity="0" />
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

      <circle cx="18" cy="18.5" r="4.4" fill="#F7F3EC" />
      <circle cx="42.5" cy="18.5" r="4" fill="#CDECE5" />
      <path
        d="M22.4 18.5h8.8c6.8 0 12.3 5.5 12.3 12.3v1.8"
        stroke="#D7EFE9"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="21" cy="51" r="3.7" fill="#F7F3EC" />
      <path
        d="M21 43.8c4 0 7.6-1.6 10.2-4.2"
        stroke="#BFE5DD"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M21 43.5c0-5.7 4.6-10.3 10.3-10.3"
        stroke="#F7F3EC"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M21 51c0-10.2 8.3-18.5 18.5-18.5"
        stroke="#D7EFE9"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
