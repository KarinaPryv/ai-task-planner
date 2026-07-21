"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecordingStatus = "idle" | "recording" | "processing";

// Fixed bar count for the waveform — each bar samples an averaged bucket
// of AnalyserNode frequency bins, updated live (UI Specification, Voice
// Recording Panel: "не декоративна анімація").
const BAR_COUNT = 32;
const LEVELS_THROTTLE_MS = 50;

// UX Specification §4.3: soft ~90s limit, auto-stop behaves exactly like
// a manual ✓ press (i.e. goes straight to transcription).
const MAX_DURATION_SECONDS = 90;

// Architecture.md §Voice Input: only these two are ever produced
// client-side (Chrome/Firefox default to webm/Opus, Safari to mp4/AAC) —
// covers both platforms without server-side transcoding.
const CANDIDATE_MIME_TYPES = ["audio/webm", "audio/mp4"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMimeType(mimeType: string): string {
  return mimeType.includes("mp4") ? "m4a" : "webm";
}

function silentLevels(): number[] {
  return Array<number>(BAR_COUNT).fill(0);
}

interface UseVoiceRecordingResult {
  status: VoiceRecordingStatus;
  elapsedSeconds: number;
  levels: number[];
  permissionDenied: boolean;
  error: string | null;
  start: () => void;
  cancel: () => void;
  finish: () => void;
}

// Architecture.md §Voice Input — транскрипція диктування: MediaRecorder
// captures audio, an AnalyserNode drives the live waveform, and the
// assembled Blob is uploaded to POST /api/brain-dump/transcribe only
// after recording stops (no real-time recognition, per UX Spec §4.1).
export function useVoiceRecording(
  onTranscribed: (text: string) => void,
): UseVoiceRecordingResult {
  const [status, setStatus] = useState<VoiceRecordingStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(silentLevels);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const lastLevelsUpdateRef = useRef(0);
  const finishRef = useRef<() => void>(() => {});
  const onTranscribedRef = useRef(onTranscribed);

  useEffect(() => {
    onTranscribedRef.current = onTranscribed;
  }, [onTranscribed]);

  const stopMediaTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runLevelLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const bucketSize = Math.max(1, Math.floor(data.length / BAR_COUNT));
    lastLevelsUpdateRef.current = 0;

    const tick = (timestamp: number) => {
      if (!analyserRef.current) return;

      if (timestamp - lastLevelsUpdateRef.current >= LEVELS_THROTTLE_MS) {
        lastLevelsUpdateRef.current = timestamp;
        analyser.getByteFrequencyData(data);

        const nextLevels: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const start = i * bucketSize;
          const end = Math.min(start + bucketSize, data.length);
          let sum = 0;
          for (let j = start; j < end; j++) sum += data[j];
          nextLevels.push(end > start ? sum / (end - start) / 255 : 0);
        }
        setLevels(nextLevels);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const finish = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    cancelledRef.current = false;
    recorder.stop();
  }, []);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const start = useCallback(() => {
    if (status !== "idle") return;
    setError(null);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setPermissionDenied(false);
        streamRef.current = stream;

        const mimeType = pickMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const wasCancelled = cancelledRef.current;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          chunksRef.current = [];
          stopTimer();
          stopLevelLoop();
          stopMediaTracks();
          recorderRef.current = null;

          if (wasCancelled) {
            setElapsedSeconds(0);
            setLevels(silentLevels());
            setStatus("idle");
            return;
          }

          setStatus("processing");

          const formData = new FormData();
          formData.append(
            "audio",
            blob,
            `recording.${extensionForMimeType(recorder.mimeType)}`,
          );

          fetch("/api/brain-dump/transcribe", { method: "POST", body: formData })
            .then(async (response) => {
              const body = await response.json().catch(() => null);

              if (!response.ok) {
                throw new Error(body?.error?.message ?? "Не вдалося розпізнати аудіо.");
              }

              const text: string = body?.data?.text ?? "";
              if (text) onTranscribedRef.current(text);
            })
            .catch(() => {
              setError("Не вдалося розпізнати запис. Спробуй ще раз.");
            })
            .finally(() => {
              setElapsedSeconds(0);
              setLevels(silentLevels());
              setStatus("idle");
            });
        };

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        cancelledRef.current = false;
        recorder.start();
        setStatus("recording");
        runLevelLoop();

        timerRef.current = setInterval(() => {
          setElapsedSeconds((previous) => {
            const next = previous + 1;
            if (next >= MAX_DURATION_SECONDS) {
              finishRef.current();
            }
            return next;
          });
        }, 1000);
      })
      .catch(() => {
        setPermissionDenied(true);
      });
  }, [status, runLevelLoop, stopLevelLoop, stopMediaTracks, stopTimer]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    cancelledRef.current = true;
    recorder.stop();
  }, []);

  // Unmount mid-recording (route change etc.) — release the mic and
  // stop all timers/loops rather than leaking them.
  useEffect(() => {
    return () => {
      stopTimer();
      stopLevelLoop();
      stopMediaTracks();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup-only, must run exactly once
  }, []);

  return { status, elapsedSeconds, levels, permissionDenied, error, start, cancel, finish };
}
