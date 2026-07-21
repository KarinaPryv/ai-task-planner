import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

// UI Specification §5 Button. Primary/Destructive are opaque and
// identical across all 4 atmosphere states; Secondary/Ghost read the
// [data-surface]-driven tokens from styles/time-of-day.css, so this
// component never branches on the current theme itself.
//
// Secondary/Ghost get an explicit hover background rather than relying on
// the shared hover:brightness below — brightness on a near-transparent
// fill (Secondary's ~6-10% alpha, Ghost's fully transparent) is barely
// perceptible, unlike on Primary/Destructive's opaque coral/red.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-accent text-white font-accent font-bold",
  destructive: "bg-destructive text-white font-accent font-bold",
  secondary:
    "bg-surface-secondary-btn hover:bg-surface-secondary-btn-hover border border-surface-secondary-btn-border text-surface-text font-body font-semibold",
  ghost: "bg-transparent hover:bg-surface-secondary-btn text-surface-ghost-text font-body font-semibold",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-[52px] px-6 text-lg",
};

function ButtonSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "relative inline-flex items-center justify-center rounded-button transition-[filter,transform]",
        "hover:brightness-[1.08] active:scale-[0.97] disabled:opacity-40",
        "focus-visible:outline-none focus-visible:shadow-focus-ring",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span className={["inline-flex items-center gap-2", loading ? "invisible" : ""].filter(Boolean).join(" ")}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <ButtonSpinner />
        </span>
      )}
    </button>
  );
});
