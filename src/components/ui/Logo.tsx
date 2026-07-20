interface LogoProps {
  size?: number;
  className?: string;
}

const GRADIENT = "linear-gradient(155deg, #FFDCA0 0%, #FF6B47 40%, #6B3FA0 75%, #1A1330 100%)";

// App logo mark — a gradient tile spanning the same warm→cool, day→night
// spectrum as the atmosphere (§1), with a white "orbit" glyph (arc + an
// orbiting body). Fixed/opaque, like Brand Accent — doesn't adapt to the
// current time-of-day or surface, it's the app's constant identity.
//
// The arc is deliberately bold (thick stroke, wide sweep): an earlier,
// thinner/larger-radius version read fine at ~96px but disappeared once
// scaled down to navbar size (~24-32px) — this single geometry is tuned
// to stay legible at the smallest size it's actually used at (the
// Drawer header) and scales up cleanly from there, rather than needing a
// separate large-size path.
export function Logo({ size = 40, className }: LogoProps) {
  const glyphSize = Math.round(size * 0.75);

  return (
    <div
      aria-hidden="true"
      className={["flex shrink-0 items-center justify-center rounded-[22%]", className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size, background: GRADIENT }}
    >
      <svg width={glyphSize} height={glyphSize} viewBox="0 0 52 52" fill="none">
        <path d="M6 34a22 22 0 0132-22" stroke="white" strokeWidth={7.5} strokeLinecap="round" />
        <circle cx={38} cy={12} r={8} fill="white" />
      </svg>
    </div>
  );
}
