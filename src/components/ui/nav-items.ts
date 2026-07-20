import { Inbox, ListChecks, Sparkle, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// UI Specification §5 Drawer — Brain Dump, Today's Plan, Drafts (Calendar
// intentionally excluded: still ⏳ pending its own UX per the spec).
// Brain Dump uses Lucide's Sparkle rather than our custom SparkIcon SVG —
// the hand-drawn artwork wasn't optically centered in its box the way
// every Lucide icon is by design, and inconsistent icon alignment stood
// out next to ListChecks/Inbox.
//
// Note: UX Specification §2.1 lists drawer contents as "Today's Plan,
// Calendar, Drafts" (no Brain Dump, Calendar included) — a real
// discrepancy with UI Spec §5. This follows UI Spec §5, which matches
// the Figma-adjacent mockup provided for this component and gives an
// explicit accessibility rationale for including Brain Dump.
export const NAV_ITEMS: NavItem[] = [
  { href: "/brain-dump", label: "Brain Dump", icon: Sparkle },
  { href: "/today", label: "Today's Plan", icon: ListChecks },
  { href: "/drafts", label: "Drafts", icon: Inbox },
];
