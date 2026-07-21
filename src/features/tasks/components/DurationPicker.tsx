"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { DropdownOption } from "@/components/ui/DropdownOption";

const DURATION_PRESETS_MINUTES = [5, 10, 15, 30, 45, 60, 90, 120];

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  trigger: (props: { toggle: () => void }) => React.ReactNode;
}

export function DurationPicker({ value, onChange, disabled, trigger }: DurationPickerProps) {
  return (
    <Dropdown
      disabled={disabled}
      panelClassName="w-[110px] max-h-[220px]"
      trigger={({ toggle }) => trigger({ toggle })}
    >
      {({ close }) => (
        <>
          {DURATION_PRESETS_MINUTES.map((minutes) => (
            <DropdownOption
              key={minutes}
              selected={minutes === value}
              onClick={() => {
                onChange(minutes);
                close();
              }}
            >
              {minutes} хв
            </DropdownOption>
          ))}
        </>
      )}
    </Dropdown>
  );
}
