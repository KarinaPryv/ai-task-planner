"use client";

import { Check, X } from "lucide-react";
import type { VoiceRecordingStatus } from "@/features/brain-dump/hooks/useVoiceRecording";

const MIN_BAR_HEIGHT = 5;
const MAX_BAR_HEIGHT = 32;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getEnhancedLevel(level: number, index: number): number {
  const amplified = Math.pow(Math.min(Math.max(level, 0), 1), 0.5);
  const variation = 0.88 + (index % 5) * 0.04;

  return Math.min(amplified * variation, 1);
}

interface VoiceRecordingPanelProps {
  status: Extract<VoiceRecordingStatus, "recording" | "processing">;
  elapsedSeconds: number;
  levels: number[];
  onCancel: () => void;
  onFinish: () => void;
}

// UI Specification — Voice Recording Panel: replaces the Brain Dump
// composer entirely while recording (same borderless/backgroundless
// footprint, no card chrome — it's a state of the signature input, not a
// separate surface). Waveform bars are driven by real AnalyserNode data
// from useVoiceRecording, not a decorative CSS animation.
export function VoiceRecordingPanel({
  status,
  elapsedSeconds,
  levels,
  onCancel,
  onFinish,
}: VoiceRecordingPanelProps) {
  const isProcessing = status === "processing";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-surface-toast-undo font-accent flex shrink-0 items-center gap-1.5 text-[13px] font-bold">
          <span className="bg-brand-accent h-[7px] w-[7px] animate-pulse rounded-full" />
          {formatElapsed(elapsedSeconds)}
        </div>

        {isProcessing ? (
          <div className="flex h-8 flex-1 items-center">
            <span className="border-brand-accent h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : (
          <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
            {levels.map((level, index) => {
              const enhancedLevel = getEnhancedLevel(level, index);
              const height =
                MIN_BAR_HEIGHT +
                enhancedLevel * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);

              return (
                <span
                  key={index}
                  className="bg-brand-accent w-[3px] shrink-0 rounded-full transition-[height] duration-75 ease-out"
                  style={{
                    height: `${height}px`,
                    opacity: 0.65 + enhancedLevel * 0.35,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Скасувати запис"
          title="Скасувати"
          className="border-surface-secondary-btn-border text-surface-text-muted flex h-9 w-9 items-center justify-center rounded-full border bg-transparent disabled:opacity-40"
        >
          <X size={14} />
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={isProcessing}
          aria-label="Завершити запис"
          title="Завершити"
          className="bg-brand-accent text-voice-confirm-icon flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-40"
        >
          <Check size={15} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
