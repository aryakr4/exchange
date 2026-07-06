import Link from "next/link";

/**
 * The RateWatch mark: a miniature exchange-board tile (dark surface, lit amber
 * caret) beside the wordmark in the display face. Ties the identity to the
 * product's signature — the board — rather than a stock trend-line glyph.
 */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight"
    >
      <span
        className="board-surface inline-flex size-6 items-center justify-center rounded-[4px] shadow-sm ring-1 ring-[#eff1ea]/15"
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="size-4" fill="none">
          <circle cx="22.5" cy="9" r="3" fill="#E4A64B" fillOpacity="0.9" />
          <path d="M4.5 26 L16 6.5 L16 26 Z" fill="#D98A45" />
          <path d="M16 6.5 L27.5 26 L16 26 Z" fill="#26332E" />
          <path
            d="M16 6.5 L12.6 11.6 L14.1 10.6 L16 12 L17.9 10.6 L19.4 11.6 Z"
            fill="#EFF1EA"
          />
        </svg>
      </span>
      RateWatch
    </Link>
  );
}
