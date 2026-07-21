"use client";

import { useState } from "react";
import { BrainDumpComposer } from "@/features/brain-dump/components/BrainDumpComposer";
import { DraftReviewList } from "@/features/brain-dump/components/DraftReviewList";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDraftReview } from "@/features/brain-dump/hooks/useDraftReview";
import { useDraftText } from "@/features/brain-dump/hooks/useDraftText";
import type { BrainDumpResponse } from "@/features/brain-dump/types";

// AI Processing (full-screen loading) is a separate, not-yet-designed
// state — this still just flips between "idle" and "loading" locally.
export default function BrainDumpPage() {
  const { text: rawText, setText: setRawText, clearDraft } = useDraftText();
  const { batches, addBatch, removeTasks, updateTask } = useDraftReview();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!rawText.trim() || status === "loading") {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await fetch("/api/brain-dump", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ raw_text: rawText }),
      });

      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Сталася помилка.");
        setStatus("error");
        return;
      }

      addBatch(body.data as BrainDumpResponse);
      clearDraft();
      setRawText("");
      setStatus("idle");
    } catch {
      setErrorMessage("Не вдалося зв'язатися з сервером.");
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {batches.length > 0 ? (
        <DraftReviewList
          batches={batches}
          onTasksConfirmedOrDeleted={removeTasks}
          onTaskUpdated={updateTask}
        />
      ) : (
        <EmptyState message="Тут з'являться твої чернетки задач після обробки" />
      )}

      {status === "error" && errorMessage && (
        <p className="text-destructive font-body px-4 pb-2 text-sm lg:px-10">{errorMessage}</p>
      )}

      <BrainDumpComposer
        value={rawText}
        onChange={setRawText}
        onSubmit={handleSubmit}
        loading={status === "loading"}
      />
    </main>
  );
}
