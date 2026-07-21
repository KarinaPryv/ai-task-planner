"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function draftKey(userId: string) {
  return `brain-dump-draft:${userId}`;
}

// UX Specification §4.4: unsent Brain Dump text survives navigating away
// and back, scoped per account (not a shared/global draft) so switching
// users on the same device never leaks or restores someone else's text.
export function useDraftText() {
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Restore once we know who the user is.
  useEffect(() => {
    if (!userId) return;

    const stored = window.localStorage.getItem(draftKey(userId));

    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads an external system (localStorage) on mount
      setText(stored);
    }
  }, [userId]);

  // Persist on change, lightly debounced to avoid a write per keystroke.
  useEffect(() => {
    if (!userId) return;

    const timeout = setTimeout(() => {
      if (text) {
        window.localStorage.setItem(draftKey(userId), text);
      } else {
        window.localStorage.removeItem(draftKey(userId));
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [userId, text]);

  function clearDraft() {
    if (userId) {
      window.localStorage.removeItem(draftKey(userId));
    }
  }

  return { text, setText, clearDraft };
}
