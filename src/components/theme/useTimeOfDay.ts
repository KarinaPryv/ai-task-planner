"use client";

import { useContext } from "react";
import { TimeOfDayContext } from "./TimeOfDayProvider";

export function useTimeOfDay() {
  const context = useContext(TimeOfDayContext);

  if (!context) {
    throw new Error("useTimeOfDay must be used within a TimeOfDayProvider.");
  }

  return context;
}
