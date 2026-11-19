/** Small monochrome social icons (inherit currentColor). */
export default function SocialIcon({ id, size = 18 }: { id: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (id) {
    case "instagram":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...p}>
          <path d="M14.5 8.5H17V5h-2.5C12 5 10.5 6.6 10.5 9v2H8v3.4h2.5V21h3.4v-6.6h2.6l.5-3.4h-3.1V9.3c0-.5.3-.8.6-.8Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 10.5V16.5M8 7.6v.1M11.5 16.5v-3.6c0-1.4.9-2.4 2.2-2.4s2 .9 2 2.4v3.6M11.5 10.5v6" />
        </svg>
      );
    case "email":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    default:
      return null;
  }
}
