"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

// Undo toast (UI Specification "Toast (undo)"): message → Ghost coral
// "Скасувати" action → linear progress bar visualizing time to
// auto-dismiss. Positioned bottom-center, above any future FAB/tab bar.
export function Toast({ message, actionLabel, onAction, onDismiss, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ backdropFilter: "blur(24px)" }}
      className="border-surface-toast-border bg-surface-toast rounded-toast shadow-glow fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] overflow-hidden border lg:inset-x-auto lg:left-1/2 lg:w-[360px] lg:-translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-body text-surface-text text-[13px] font-medium">{message}</span>
        <button
          type="button"
          onClick={onAction}
          className="text-surface-toast-undo font-accent shrink-0 text-[13px] font-bold"
        >
          {actionLabel}
        </button>
      </div>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: durationMs / 1000, ease: "linear" }}
        className="bg-brand-accent h-[2px] w-full origin-left"
      />
    </motion.div>
  );
}
