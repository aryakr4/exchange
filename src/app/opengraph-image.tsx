import { ImageResponse } from "next/og";

export const alt = "RateWatch — rate alerts for sending money home";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Board-style share card: the wordmark, the promise, and a slice of the
// live board rendered in the product's own palette.
const ROWS = [
  { pair: "USD → MXN", rate: "17.47", up: true },
  { pair: "USD → INR", rate: "95.43", up: false },
  { pair: "GBP → INR", rate: "127.4", up: true },
];

/** SVG triangle so it doesn't depend on a font shipping the ▲/▼ glyph. */
function Tri({ up, size: s, color }: { up: boolean; size: number; color: string }) {
  return (
    <svg width={s * 1.2} height={s} viewBox="0 0 12 10">
      <path d={up ? "M6 0 L12 10 L0 10 Z" : "M0 0 L12 0 L6 10 Z"} fill={color} />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#14201c",
          backgroundImage:
            "radial-gradient(120% 90% at 70% -10%, #1c2b26 0%, #14201c 55%, #0e1714 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0e1714",
              border: "1px solid rgba(239,241,234,0.16)",
            }}
          >
            <svg width={34} height={34} viewBox="0 0 32 32">
              <circle cx="22.5" cy="9" r="3" fill="#E4A64B" fillOpacity={0.9} />
              <path d="M4.5 26 L16 6.5 L16 26 Z" fill="#D98A45" />
              <path d="M16 6.5 L27.5 26 L16 26 Z" fill="#26332E" />
              <path
                d="M16 6.5 L12.6 11.6 L14.1 10.6 L16 12 L17.9 10.6 L19.4 11.6 Z"
                fill="#EFF1EA"
              />
            </svg>
          </div>
          <div style={{ color: "#eff1ea", fontSize: 34, fontWeight: 700 }}>
            RateWatch
          </div>
        </div>

        {/* promise */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              color: "#8fa89b",
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            For everyone who sends money home
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -2,
              color: "#eff1ea",
            }}
          >
            More of it reaches&nbsp;<span style={{ color: "#4cc79b" }}>home.</span>
          </div>
        </div>

        {/* mini board */}
        <div style={{ display: "flex", gap: 48 }}>
          {ROWS.map((r) => (
            <div key={r.pair} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: "#7f8a82", fontSize: 24 }}>{r.pair}</span>
              <span style={{ color: "#eab662", fontSize: 30, fontWeight: 600 }}>
                {r.rate}
              </span>
              <Tri up={r.up} size={11} color={r.up ? "#4cc79b" : "#8b978f"} />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
