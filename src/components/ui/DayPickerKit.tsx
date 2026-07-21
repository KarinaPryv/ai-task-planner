"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChevronProps, DayButtonProps } from "react-day-picker";

// Shared re-skin for react-day-picker, used headlessly (no bundled
// stylesheet) so every date picker in the app (DateFieldPicker,
// WeekDatePicker) matches the Dropdown panel system exactly rather than
// looking like a bolted-on third-party widget.
export function DayPickerDayButton({ day, modifiers, ...props }: DayButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
        modifiers.selected
          ? "bg-brand-accent text-white"
          : modifiers.today
            ? "text-brand-accent"
            : "text-surface-text hover:bg-surface-secondary-btn",
        modifiers.outside ? "opacity-30" : "",
        modifiers.disabled ? "pointer-events-none opacity-20" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {day.date.getDate()}
    </button>
  );
}

export function DayPickerChevron({ orientation }: ChevronProps) {
  return orientation === "left" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />;
}

export const DAY_PICKER_CLASSNAMES = {
  months: "flex flex-col",
  month: "space-y-1.5",
  month_caption: "relative flex h-7 items-center justify-center",
  caption_label: "font-accent text-surface-text text-[13px] font-bold",
  nav: "absolute inset-x-0 flex items-center justify-between",
  button_previous:
    "text-surface-text-muted hover:bg-surface-secondary-btn flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-30",
  button_next:
    "text-surface-text-muted hover:bg-surface-secondary-btn flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-30",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "text-surface-text-muted w-8 text-center text-[10px] font-semibold uppercase",
  week: "flex mt-0.5",
  day: "h-8 w-8 p-0 text-center",
};
