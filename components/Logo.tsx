export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE29A" />
          <stop offset="1" stopColor="#F5B700" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" stroke="url(#lg)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="22" stroke="#FFD166" strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="2 4" />
      <path d="M32 8 L38 32 L32 56 L26 32 Z" fill="url(#lg)" />
      <path d="M32 8 L38 32 L26 32 Z" fill="#fff" fillOpacity=".35" />
      <path d="M8 32 L32 27 L56 32 L32 37 Z" fill="#FFD166" fillOpacity=".35" />
      <circle cx="32" cy="32" r="3.5" fill="#07090F" stroke="#FFD166" strokeWidth="1.5" />
    </svg>
  );
}
