"use client";

import { useEffect, useRef, useState } from "react";

type AtmosphereState = "morning" | "day" | "evening" | "night";

const STATES: AtmosphereState[] = ["morning", "day", "evening", "night"];

const LABELS: Record<AtmosphereState, string> = {
  morning: "Ранок",
  day: "День",
  evening: "Вечір",
  night: "Ніч",
};

// Decorative only — not drawn from any design token, unlike the frame's
// own background (which reuses the real .atmosphere-layer gradient via a
// local data-time-theme, see below).
const ORB_STYLE: Record<AtmosphereState, { background: string; boxShadow: string; transform: string }> = {
  morning: { background: "#FFF3D6", boxShadow: "0 0 50px 14px rgba(255,243,214,0.7)", transform: "translate(0,0)" },
  day: { background: "#FFFDF2", boxShadow: "0 0 60px 18px rgba(255,253,242,0.85)", transform: "translate(30px,-6px)" },
  evening: { background: "#FFD6A8", boxShadow: "0 0 50px 14px rgba(255,214,168,0.6)", transform: "translate(60px,10px)" },
  night: {
    background: "#E9E4F5",
    boxShadow: "0 0 34px 10px rgba(233,228,245,0.4)",
    transform: "translate(90px,4px) scale(0.7)",
  },
};

interface Particle {
  size: number;
  top: number;
  left: number;
  duration: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    size: 2 + Math.random() * 4,
    top: Math.random() * 90,
    left: Math.random() * 95,
    duration: 4 + Math.random() * 5,
    delay: Math.random() * 4,
  }));
}

// Landing page marketing feature — cycles through the app's real 4
// atmosphere states (auto-advancing every 4s once the demo actually
// scrolls into view, or tap a tab to jump and stop autoplay) inside a
// small demo frame. The frame's own background reuses .atmosphere-layer
// (styles/time-of-day.css) via a locally-set data-time-theme, so it's
// showing the exact real gradients, not an approximation — only the orb
// glow/particles here are bespoke decor.
export function AtmosphereShowcase() {
  // Starts on "morning" and stays there until the section is actually
  // visible — autoplay only begins once scrolled into view (below), so
  // a visitor who takes a while to scroll down always sees the cycle
  // start from the beginning instead of landing mid-cycle.
  const [state, setState] = useState<AtmosphereState>("morning");
  // Empty on first render (server and client agree) — the random
  // particle positions/timings are only generated after mount, client-side
  // only. Computing them eagerly in a useState initializer would run
  // Math.random() during SSR too, and the server's numbers would never
  // match the client's on hydration.
  const [particles, setParticles] = useState<Particle[]>([]);
  const indexRef = useRef(0);
  // Interval id lives in a ref, not state, and is cleared imperatively
  // from the click handler — stopping autoplay this way is immediate and
  // doesn't depend on an effect re-running in response to a state change
  // first.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- generates client-only random values (Math.random()) that must never run during SSR, see comment above
    setParticles(generateParticles(14));
  }, []);

  function startAutoplay() {
    if (timerRef.current || hasStartedRef.current) return;
    hasStartedRef.current = true;

    timerRef.current = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % STATES.length;
      setState(STATES[indexRef.current]);
    }, 4000);
  }

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAutoplay();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleTabClick(next: AtmosphereState) {
    hasStartedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    indexRef.current = STATES.indexOf(next);
    setState(next);
  }

  const orb = ORB_STYLE[state];
  const isDark = state === "night";

  return (
    <div ref={frameRef} className="flex w-full flex-col items-center gap-6">
      <div
        data-time-theme={state}
        className="atmosphere-layer relative h-[240px] w-full max-w-[560px] overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgba(33,28,46,0.18)] transition-[background] duration-700 sm:h-[320px]"
      >
        <div
          className="absolute top-[38px] left-[42px] h-16 w-16 rounded-full transition-all duration-700"
          style={{ background: orb.background, boxShadow: orb.boxShadow, transform: orb.transform }}
        />

        {particles.map((particle, index) => (
          <span
            key={index}
            className={[
              "absolute rounded-full blur-[1px]",
              "[animation-name:atmosphere-particle-drift] [animation-iteration-count:infinite] [animation-timing-function:linear] motion-reduce:animate-none",
              isDark ? "bg-white/90" : "bg-white/75",
            ].join(" ")}
            style={{
              width: particle.size,
              height: particle.size,
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}

        <span
          className={[
            "font-accent absolute bottom-[22px] left-[26px] text-[15px] font-bold transition-colors duration-500",
            isDark ? "text-white/85" : "text-[#2A2438]/75",
          ].join(" ")}
        >
          {LABELS[state]}
        </span>
      </div>

      <div className="inline-flex gap-1.5 rounded-full bg-[#211C2E]/5 p-1.5">
        {STATES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleTabClick(item)}
            className={[
              "font-body rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-colors sm:px-4.5 sm:text-[13px]",
              item === state ? "bg-[#211C2E] text-white" : "text-[#746C82] hover:text-[#211C2E]",
            ].join(" ")}
          >
            {LABELS[item]}
          </button>
        ))}
      </div>
    </div>
  );
}
