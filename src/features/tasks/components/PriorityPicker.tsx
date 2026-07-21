"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { DropdownOption } from "@/components/ui/DropdownOption";
import type { Task } from "@/features/tasks/types";

export const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
};

const PRIORITIES: Task["priority"][] = ["low", "medium", "high"];

interface PriorityPickerProps {
  value: Task["priority"];
  onChange: (priority: Task["priority"]) => void;
  disabled?: boolean;
}

export function PriorityPicker({ value, onChange, disabled }: PriorityPickerProps) {
  return (
    <Dropdown
      disabled={disabled}
      panelClassName="w-[150px]"
      trigger={({ toggle }) => (
        <Badge variant={value} onClick={toggle}>
          {PRIORITY_LABELS[value]}
          <ChevronDown size={9} className="opacity-70" />
        </Badge>
      )}
    >
      {({ close }) => (
        <>
          {PRIORITIES.map((priority) => (
            <DropdownOption
              key={priority}
              selected={priority === value}
              dotColor={`var(--badge-${priority}-fg)`}
              selectedTint={`var(--badge-${priority}-bg)`}
              onClick={() => {
                onChange(priority);
                close();
              }}
            >
              {PRIORITY_LABELS[priority]}
            </DropdownOption>
          ))}
        </>
      )}
    </Dropdown>
  );
}
