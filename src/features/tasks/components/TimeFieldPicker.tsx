"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { DropdownOption } from "@/components/ui/DropdownOption";

const TIME_SLOTS: string[] = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, "0");
  const minutes = String((index % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

interface TimeFieldPickerProps {
  value: string | null;
  onChange: (time: string | null) => void;
  disabled?: boolean;
  trigger: (props: { toggle: () => void }) => React.ReactNode;
}

export function TimeFieldPicker({ value, onChange, disabled, trigger }: TimeFieldPickerProps) {
  const currentSlot = value?.slice(0, 5) ?? null;

  return (
    <Dropdown
      disabled={disabled}
      panelClassName="w-[110px] max-h-[220px]"
      trigger={({ toggle }) => trigger({ toggle })}
    >
      {({ close }) => (
        <>
          <DropdownOption
            selected={currentSlot === null}
            onClick={() => {
              onChange(null);
              close();
            }}
          >
            Без часу
          </DropdownOption>

          {TIME_SLOTS.map((slot) => (
            <DropdownOption
              key={slot}
              selected={slot === currentSlot}
              onClick={() => {
                onChange(`${slot}:00`);
                close();
              }}
            >
              {slot}
            </DropdownOption>
          ))}
        </>
      )}
    </Dropdown>
  );
}
