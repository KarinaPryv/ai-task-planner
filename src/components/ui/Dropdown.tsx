"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";

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
//
// Positioned via @floating-ui/react rather than a plain absolute child:
// when this trigger lives inside a scrollable container with a bounded
// height (e.g. Task Detail's modal body), a same-tree `position: absolute`
// panel would inflate that container's scrollHeight and get clipped by its
// overflow. FloatingPortal renders the panel into document.body instead —
// `strategy: "fixed"` + `autoUpdate` keep it correctly anchored to the
// trigger across scroll/resize (including scrolling the modal's own inner
// container, not just the window), `flip`/`shift` keep it on-screen near
// viewport edges, and `useDismiss` handles outside-click/Escape with the
// portaled panel itself correctly counted as "inside" (a hand-rolled
// `container.contains(event.target)` check would not see into the portal).
export function Dropdown({ trigger, children, panelClassName, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false);

  function toggle() {
    if (disabled) return;
    setOpen((prev) => !prev);
  }

  function close() {
    setOpen(false);
  }

  const { refs, x, y, strategy, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()} className="inline-flex">
        {trigger({ open, toggle })}
      </div>
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              // refs.setFloating is a stable callback ref from useFloating(), not a
              // `.current` read; the rule can't see through
              // @floating-ui/react's ref-setter pattern.
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              role="listbox"
              // Plain top/left, not floating-ui's `floatingStyles` (which
              // positions via CSS `transform`) — motion.div already owns
              // `transform` for its own scale/y animation below, and the
              // two would silently clobber each other, collapsing the
              // panel to (0, 0).
              style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
                backdropFilter: "blur(24px)",
              }}
              {...getFloatingProps()}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={[
                "border-surface-modal-border bg-surface-modal shadow-glow rounded-dropdown z-[60] overflow-hidden",
                panelClassName,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Scrolling (and its padding) lives on this inner wrapper, not
                  the outer motion.div above: a scrollbar rendered on the same
                  element as `rounded-dropdown` sits flush against the border
                  box and visibly cuts across the rounded corners. Splitting
                  the frame (radius/clip/shadow) from the scroll container
                  keeps the outer's rounded corners intact regardless of
                  whether this panel's content overflows. `max-h-[inherit]`
                  picks up whatever max-height panelClassName set on the
                  outer (e.g. TimeFieldPicker's 220px) — falls back to `none`
                  (no cap, no scroll) for panels that don't set one. The
                  extra right padding keeps the scrollbar track clear of the
                  rounded corner when a scrollbar is actually present. */}
              <div className="max-h-[inherit] overflow-y-auto p-2 pr-3">
                {children({ close })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
