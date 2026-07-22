"use client";

import { useEffect, useState } from "react";

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
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: 4 + Math.random() * 5,
    delay: Math.random() * 4,
  }));
}

// Today's Plan "all done" celebration — shown instead of the plain
// "Усі задачі на сьогодні виконані" text when there were tasks today and
// every one is now done (TodayPlanList keeps the "Виконано" list below
// this unchanged; this only replaces the empty active-zone message).
// Particle-drift reuses AtmosphereShowcase's exact pattern/keyframe
// (styles/tokens.css) rather than duplicating it.
export function AllDoneCelebration() {
  // Empty on first render (server and client agree) — Math.random() must
  // only run client-side, see AtmosphereShowcase for the same pattern.
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- generates client-only random values (Math.random()), see comment above
    setParticles(generateParticles(12));
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full overflow-visible">
          <circle
            cx="90"
            cy="90"
            r="58"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            className="origin-[90px_90px] opacity-30 motion-safe:[animation:celebration-ring-pulse_3.6s_ease-in-out_infinite] motion-reduce:animate-none"
          />
          <circle
            cx="90"
            cy="90"
            r="34"
            fill="#FFF6E4"
            className="origin-[90px_90px] motion-safe:[animation:celebration-core-breathe_3.6s_ease-in-out_infinite] motion-reduce:animate-none"
          />
          <circle cx="90" cy="90" r="34" fill="none" stroke="var(--color-brand-accent)" strokeWidth="1" opacity="0.25" />
          <path
            d="M76 90l9 9 20-20"
            stroke="var(--color-brand-accent)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="34" cy="52" r="4" fill="white" opacity="0.8" />
          <circle cx="146" cy="60" r="3" fill="white" opacity="0.8" />
          <circle cx="40" cy="132" r="3.5" fill="white" opacity="0.8" />
          <circle cx="140" cy="128" r="5" fill="white" opacity="0.8" />
        </svg>

        <div aria-hidden="true" className="pointer-events-none absolute -inset-4">
          {particles.map((particle, index) => (
            <span
              key={index}
              className="absolute rounded-full bg-white/85 blur-[1px] [animation-name:atmosphere-particle-drift] [animation-iteration-count:infinite] [animation-timing-function:linear] motion-reduce:animate-none"
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
        </div>
      </div>

      <div>
        <p className="font-accent text-surface-text text-[17px] font-bold">Усе зроблено. Гарна робота.</p>
        <p className="font-body text-surface-text-muted mt-1 text-[13px] opacity-65">
          На сьогодні більше нічого не заплановано
        </p>
      </div>
    </div>
  );
}
