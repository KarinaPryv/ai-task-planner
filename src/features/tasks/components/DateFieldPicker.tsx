"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type ChevronProps, type DayButtonProps } from "react-day-picker";
import { uk } from "react-day-picker/locale";
import { Dropdown } from "@/components/ui/Dropdown";

function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// react-day-picker is used headlessly here (no bundled stylesheet
// imported) — every element is re-skinned via `components` so it matches
// the Dropdown panel system exactly rather than looking like a bolted-on
// third-party widget.
function CustomDayButton({ day, modifiers, ...props }: DayButtonProps) {
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

function CustomChevron({ orientation }: ChevronProps) {
  return orientation === "left" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />;
}

interface DateFieldPickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  trigger: (props: { toggle: () => void }) => React.ReactNode;
}

export function DateFieldPicker({ value, onChange, disabled, trigger }: DateFieldPickerProps) {
  return (
    <Dropdown
      disabled={disabled}
      panelClassName="w-[264px] p-2"
      trigger={({ toggle }) => trigger({ toggle })}
    >
      {({ close }) => (
        <DayPicker
          mode="single"
          locale={uk}
          weekStartsOn={1}
          selected={parseLocalDate(value)}
          onSelect={(date) => {
            if (!date) return;
            onChange(toLocalIsoDate(date));
            close();
          }}
          components={{ DayButton: CustomDayButton, Chevron: CustomChevron }}
          classNames={{
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
          }}
        />
      )}
    </Dropdown>
  );
}
