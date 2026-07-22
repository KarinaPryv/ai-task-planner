interface SkeletonProps {
  className?: string;
}

// Pulsing placeholder block for loading.tsx route boundaries. Reads
// --surface-text at low opacity so it adapts to light/dark surface
// automatically, same as every other token-driven primitive. No default
// radius — callers pass their own rounded-* class so it never conflicts
// with one baked in here.
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`bg-surface-text/10 animate-pulse ${className}`} />;
}
