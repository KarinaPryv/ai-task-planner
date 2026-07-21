"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface DropdownRenderProps {
  open: boolean;
  toggle: () => void;
}

interface DropdownContentProps {
  close: () => void;
}

interface DropdownProps {
  trigger: (props: DropdownRenderProps) => ReactNode;
  children: (props: DropdownContentProps) => ReactNode;
  // Panel sizing/positioning — caller's concern (a 150px priority list vs
  // a ~280px calendar are very different shapes).
  panelClassName?: string;
  disabled?: boolean;
}

// Generic trigger-anchored option panel, reused for priority/date/time
// editing on Draft Review cards (and anywhere else a small "pick one"
// control is needed). The trigger itself is the only interactive
// affordance — no separate arrow/icon element — per spec: less UI noise
// on a small card.
//
// Panel styling matches Modal's adaptive light/dark surface + blur + glow
// (both are transient overlays), but animates faster (150ms) — a dropdown
// should read as instantaneous, not as a separate "step" the way a modal
// is.
export function Dropdown({ trigger, children, panelClassName, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (disabled) return;
    setOpen((prev) => !prev);
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      {trigger({ open, toggle })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ backdropFilter: "blur(24px)" }}
            className={[
              "border-surface-modal-border bg-surface-modal shadow-glow rounded-dropdown absolute z-20 mt-1.5 overflow-hidden p-1.5",
              panelClassName,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children({ close })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
