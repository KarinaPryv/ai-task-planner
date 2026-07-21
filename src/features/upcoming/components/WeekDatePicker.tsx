"use client";

import { DayPicker } from "react-day-picker";
import { uk } from "react-day-picker/locale";
import { Dropdown } from "@/components/ui/Dropdown";
import { DAY_PICKER_CLASSNAMES, DayPickerChevron, DayPickerDayButton } from "@/components/ui/DayPickerKit";
import { parseLocalDate, toLocalIsoDate } from "@/lib/date";

interface WeekDatePickerProps {
  today: string;
  disabled?: boolean;
  onSelect: (isoDate: string) => void;
  trigger: (props: { toggle: () => void }) => React.ReactNode;
}

// UX Specification §10.2 — jumps the board to the week containing the
// picked date. Only today/future dates are selectable, mirroring the
// disabled "week back" arrow on the current week.
export function WeekDatePicker({ today, disabled, onSelect, trigger }: WeekDatePickerProps) {
  return (
    <Dropdown disabled={disabled} panelClassName="w-[264px]" trigger={({ toggle }) => trigger({ toggle })}>
      {({ close }) => (
        <DayPicker
          mode="single"
          locale={uk}
          weekStartsOn={1}
          disabled={{ before: parseLocalDate(today) }}
          onSelect={(date) => {
            if (!date) return;
            onSelect(toLocalIsoDate(date));
            close();
          }}
          components={{ DayButton: DayPickerDayButton, Chevron: DayPickerChevron }}
          classNames={DAY_PICKER_CLASSNAMES}
        />
      )}
    </Dropdown>
  );
}
