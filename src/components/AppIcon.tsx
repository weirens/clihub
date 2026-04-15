interface AppIconProps {
  className?: string;
}

export function AppIcon({ className }: AppIconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="52" height="52" rx="18" fill="url(#clihub-bg)" />
      <path
        d="M21 24.5C21 21.4624 23.4624 19 26.5 19H41.5V26.5H30C27.7909 26.5 26 28.2909 26 30.5V33.5C26 35.7091 27.7909 37.5 30 37.5H43V45H26.5C23.4624 45 21 42.5376 21 39.5V24.5Z"
        fill="#F2F5F7"
      />
      <path
        d="M43 19H46V45H43V19Z"
        fill="#AEB6BF"
      />
      <defs>
        <linearGradient id="clihub-bg" x1="10" y1="8" x2="58" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B2027" />
          <stop offset="1" stopColor="#07090D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
