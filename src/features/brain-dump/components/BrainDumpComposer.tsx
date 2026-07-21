"use client";

import { useRef, type ChangeEvent } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BrainDumpComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}

const MAX_TEXTAREA_HEIGHT = 200;

// UI Specification §5 Brain Dump Input — signature, borderless/
// backgroundless field. Exact layout (bottom composer bar, mic + "Далі"
// row separated by a hairline) confirmed via mockup rather than the
// spec's more abstract description. Mic button is intentionally static
// for now — voice dictation (UX Specification §4.1/§4.3) is a separate
// increment. "Далі" reuses Button as-is (no bespoke disabled styling).
export function BrainDumpComposer({ value, onChange, onSubmit, loading }: BrainDumpComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);

    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }
  }

  return (
    <div className="shrink-0 px-4 pt-3.5 pb-5 lg:px-10 lg:pt-4.5 lg:pb-6.5">
      <div className="lg:mx-auto lg:max-w-[620px]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          rows={1}
          placeholder="Про що думаєш? Пиши все підряд, я розберуся..."
          className="text-surface-text placeholder:text-surface-text font-body w-full resize-none text-[17px] leading-[1.5] font-medium outline-none placeholder:opacity-40"
          style={{ minHeight: 50 }}
        />

        <div className="border-surface-drawer-border mt-3.5 flex items-center justify-between border-t pt-3.5">
          <button
            type="button"
            disabled
            title="Голосове введення — незабаром"
            className="bg-surface-secondary-btn border-surface-secondary-btn-border text-surface-text flex h-[42px] w-[42px] items-center justify-center rounded-full border disabled:opacity-40"
          >
            <Mic size={18} />
          </button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!value.trim()}
            loading={loading}
            onClick={onSubmit}
          >
            Далі
          </Button>
        </div>
      </div>
    </div>
  );
}
