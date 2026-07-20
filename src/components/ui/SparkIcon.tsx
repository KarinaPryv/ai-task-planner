interface SparkIconProps {
  size?: number;
  className?: string;
}

// The product's recurring "spark" motif (UI Specification §4 Iconography
// & Imagery) — shared across the wordmark, FAB, AI-suggestion badge, and
// empty states, rather than a separate icon per place. Geometry sourced
// from Figma (node 8:97, file KJdzlOzt7AbKUXca1gmpDk). Defaults to
// currentColor so callers control color via className.
export function SparkIcon({ size = 24, className }: SparkIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 3.33337L23 12.6667L31.6667 15L23 17.3334L20 26.6667L17 17.3334L8.33334 15L17 12.6667L20 3.33337Z"
        fill="currentColor"
      />
    </svg>
  );
}
