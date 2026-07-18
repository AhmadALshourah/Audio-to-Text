interface LogoProps {
  label: string;
  /** Hide the wordmark, show the mark only (e.g. compact headers). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Brand mark: an annotated manuscript page — a rubrication-red margin rule
 * beside ink text-lines. Echoes the product (voice committed to a marked-up
 * page) and the "Rubrication" design thesis. Paired with the Fraunces wordmark.
 */
export function Logo({ label, markOnly = false, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="24"
          height="24"
          rx="6"
          className="fill-ink"
        />
        {/* rubrication margin rule */}
        <rect x="7" y="7" width="1.8" height="12" rx="0.9" className="fill-accent" />
        {/* ink text lines */}
        <rect x="11" y="8" width="8" height="1.8" rx="0.9" className="fill-paper" />
        <rect x="11" y="12.1" width="8" height="1.8" rx="0.9" className="fill-paper" opacity="0.75" />
        <rect x="11" y="16.2" width="5" height="1.8" rx="0.9" className="fill-paper" opacity="0.5" />
      </svg>
      {!markOnly && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
          {label}
        </span>
      )}
    </span>
  );
}
