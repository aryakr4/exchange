import { flagFor } from "@/features/markets/currencies";

/**
 * Renders a corridor label like "USD → MXN" with each currency's country flag
 * prepended — 🇺🇸 USD → 🇲🇽 MXN — so a sender recognizes their corridor
 * instantly. Flags are decorative (aria-hidden); the currency codes carry the
 * accessible meaning and remain visible if a flag glyph can't render.
 */
export function CurrencyPair({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const codes = label
    .split("→")
    .map((code) => code.trim())
    .filter(Boolean);

  return (
    <span className={className}>
      {codes.map((code, i) => {
        const flag = flagFor(code);
        return (
          <span key={`${code}-${i}`} className="whitespace-nowrap">
            {i > 0 ? <span className="opacity-50"> → </span> : null}
            {flag ? <span aria-hidden="true">{flag} </span> : null}
            {code}
          </span>
        );
      })}
    </span>
  );
}
