"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVoiceRecording } from "@/features/brain-dump/hooks/useVoiceRecording";
import { VoiceRecordingPanel } from "@/features/brain-dump/components/VoiceRecordingPanel";

interface BrainDumpComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}

const MAX_TEXTAREA_HEIGHT = 200;

// Appends a voice transcript to already-typed text without producing a
// double space or a stray leading space (per product feedback): an empty
// field just gets the transcript, a non-empty one gets a single space
// inserted only if it doesn't already end in whitespace/newline.
function appendTranscript(current: string, transcript: string): string {
  if (!current) return transcript;
  return /\s$/.test(current) ? `${current}${transcript}` : `${current} ${transcript}`;
}

// UI Specification §5 Brain Dump Input — signature, borderless/
// backgroundless field. Exact layout (bottom composer bar, mic + "Далі"
// row separated by a hairline) confirmed via mockup rather than the
// spec's more abstract description.
//
// Voice dictation (UX Specification §4.1/§4.3): tapping the mic swaps
// this entire block for VoiceRecordingPanel — same outer padding, so the
// page doesn't jump — until recording finishes or is cancelled.
export function BrainDumpComposer({ value, onChange, onSubmit, loading }: BrainDumpComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { status, elapsedSeconds, levels, permissionDenied, error, start, cancel, finish } =
    useVoiceRecording((transcript) => onChange(appendTranscript(value, transcript)));

  const isRecording = status !== "idle";

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  // Keyed on `value` (not the change event) so programmatic updates —
  // a voice transcript getting appended, or the draft being cleared on
  // submit — resize the textarea too, not just direct typing.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  return (
    <div className="shrink-0 px-4 pt-3.5 pb-5 lg:px-10 lg:pt-4.5 lg:pb-6.5">
      <div className="lg:mx-auto lg:max-w-[620px]">
        {isRecording ? (
          <VoiceRecordingPanel
            status={status}
            elapsedSeconds={elapsedSeconds}
            levels={levels}
            onCancel={cancel}
            onFinish={finish}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            rows={1}
            placeholder="Про що думаєш? Пиши все підряд, я розберуся..."
            className="text-surface-text placeholder:text-surface-text font-body w-full resize-none text-[17px] leading-[1.5] font-medium outline-none placeholder:opacity-40"
            style={{ minHeight: 50 }}
          />
        )}

        <div className="border-surface-drawer-border mt-3.5 flex items-center justify-between border-t pt-3.5">
          <button
            type="button"
            onClick={start}
            disabled={isRecording || permissionDenied}
            title={permissionDenied ? "Доступ до мікрофона заборонено" : "Голосове введення"}
            className="bg-surface-secondary-btn border-surface-secondary-btn-border text-surface-text flex h-[42px] w-[42px] items-center justify-center rounded-full border disabled:opacity-40"
          >
            <Mic size={18} />
          </button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!value.trim() || isRecording}
            loading={loading}
            onClick={onSubmit}
          >
            Далі
          </Button>
        </div>

        {permissionDenied && (
          <p className="text-destructive font-body mt-2 text-xs">
            Доступ до мікрофона заборонено. Дозволь його в налаштуваннях браузера, щоб диктувати.
          </p>
        )}

        {!permissionDenied && error && (
          <p className="text-destructive font-body mt-2 text-xs">{error}</p>
        )}
      </div>
    </div>
  );
}
