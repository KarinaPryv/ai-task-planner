import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface DropdownOptionProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  // Colored dot, e.g. a badge's fg color — omit for options with no
  // inherent color (e.g. a time slot).
  dotColor?: string;
  // Selected-state tint background, e.g. a badge's bg color.
  selectedTint?: string;
}

export function DropdownOption({
  selected,
  onClick,
  children,
  dotColor,
  selectedTint,
}: DropdownOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      style={selected ? { backgroundColor: selectedTint } : undefined}
      className="text-surface-text hover:bg-surface-secondary-btn flex w-full items-center justify-between gap-3 rounded-[9px] px-2.5 py-2 text-left font-body text-[12px] font-semibold"
    >
      <span className="inline-flex items-center gap-1.5">
        {dotColor && (
          <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        )}
        {children}
      </span>
      {selected && <Check size={12} className="shrink-0 opacity-80" />}
    </button>
  );
}
