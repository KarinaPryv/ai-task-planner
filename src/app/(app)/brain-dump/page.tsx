"use client";

import { useState } from "react";

interface BrainDumpTask {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  priority_is_suggestion: boolean;
  duration_minutes: number;
  duration_is_suggestion: boolean;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "draft" | "confirmed" | "done";
  sort_order: number;
}

interface BrainDumpResult {
  brainDumpEntry: { id: string; raw_text: string; created_at: string };
  tasks: BrainDumpTask[];
  warnings: unknown[];
}

// Increment 8 test harness: Confirm/Edit/Delete/Confirm remaining buttons
// exercise the new endpoints against the tasks created by the smoke-test
// submit below. No real design yet — that arrives with the actual
// Brain Dump / Review UI in a later increment.
export default function BrainDumpPage() {
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BrainDumpResult | null>(null);

  async function handleSubmit() {
    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

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

      setResult(body.data);
      setStatus("idle");
    } catch {
      setErrorMessage("Не вдалося зв'язатися з сервером.");
      setStatus("error");
    }
  }

  function patchTaskLocally(id: string, patch: Partial<BrainDumpTask>) {
    setResult((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)) }
        : prev,
    );
  }

  function removeTaskLocally(id: string) {
    setResult((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((task) => task.id !== id) } : prev));
  }

  async function handleConfirm(id: string) {
    const response = await fetch(`/api/tasks/${id}/confirm`, { method: "POST" });
    const body = await response.json();

    if (!response.ok) {
      window.alert(body?.error?.message ?? "Не вдалося підтвердити задачу.");
      return;
    }

    patchTaskLocally(id, { status: "confirmed" });
  }

  async function handleEdit(id: string, currentTitle: string) {
    const newTitle = window.prompt("Нова назва задачі:", currentTitle);

    if (newTitle === null || newTitle.trim() === "" || newTitle === currentTitle) {
      return;
    }

    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });

    const body = await response.json();

    if (!response.ok) {
      window.alert(body?.error?.message ?? "Не вдалося оновити задачу.");
      return;
    }

    patchTaskLocally(id, { title: body.data.title });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Видалити задачу?")) {
      return;
    }

    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json();
      window.alert(body?.error?.message ?? "Не вдалося видалити задачу.");
      return;
    }

    removeTaskLocally(id);
  }

  async function handleConfirmRemaining() {
    if (!result) return;

    const response = await fetch(
      `/api/brain-dump/${result.brainDumpEntry.id}/confirm-remaining`,
      { method: "POST" },
    );

    const body = await response.json();

    if (!response.ok) {
      window.alert(body?.error?.message ?? "Не вдалося підтвердити задачі.");
      return;
    }

    const confirmedIds: string[] = body.data.confirmed;
    setResult((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((task) =>
              confirmedIds.includes(task.id) ? { ...task, status: "confirmed" } : task,
            ),
          }
        : prev,
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Brain Dump</h1>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={6}
        className="w-full max-w-xl border p-2"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={rawText.trim().length === 0 || status === "loading"}
        className="w-fit rounded-md border px-4 py-2"
      >
        {status === "loading" ? "Обробка..." : "Далі"}
      </button>

      {status === "error" && <p>{errorMessage}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirmRemaining}
            className="w-fit rounded-md border px-4 py-2"
          >
            Confirm remaining
          </button>

          <ul className="flex flex-col gap-2">
            {result.tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 border p-2">
                <span className="flex-1">
                  [{task.status}] {task.title} ({task.duration_minutes} хв, {task.priority})
                </span>
                <button type="button" onClick={() => handleConfirm(task.id)} className="border px-2 py-1">
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(task.id, task.title)}
                  className="border px-2 py-1"
                >
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(task.id)} className="border px-2 py-1">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
