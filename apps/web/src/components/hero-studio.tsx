'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface HeroStudioProps {
  /** Rotating sample transcripts that type themselves out. */
  phrases: string[];
  liveLabel: string;
  listeningLabel: string;
  fileLabel: string;
}

// Deterministic bars that read like a real speech envelope. Values are
// pre-rounded to fixed precision so the server- and client-rendered inline
// styles are byte-identical (float rounding otherwise diverges → hydration
// mismatch).
const BAR_COUNT = 44;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const envelope = Math.sin((i / BAR_COUNT) * Math.PI); // louder in the middle
  const wobble = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7));
  const h = Math.max(0.18, envelope * wobble);
  return {
    height: Math.round(18 + h * 64), // px
    opacity: Number((0.35 + h * 0.65).toFixed(3)),
    delay: `${((i % 11) * -0.11).toFixed(2)}s`,
  };
});

/**
 * The hero's signature anchor: a "listening" waveform above a live transcript
 * that types itself out, cycling through sample phrases. It literally performs
 * the product — voice becoming text — which is the brand thesis.
 */
export function HeroStudio({ phrases, liveLabel, listeningLabel, fileLabel }: HeroStudioProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const reducedMotion = useRef(false);

  const active = useMemo(() => phrases[phraseIndex % phrases.length] ?? '', [phrases, phraseIndex]);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reducedMotion.current) {
      setText(active);
      return;
    }
    setText('');
    let i = 0;
    const typer = setInterval(() => {
      i += 1;
      setText(active.slice(0, i));
      if (i >= active.length) {
        clearInterval(typer);
        // Hold the finished line, then advance to the next phrase.
        setTimeout(() => setPhraseIndex((p) => p + 1), 2200);
      }
    }, 45);
    return () => clearInterval(typer);
  }, [active]);

  return (
    <div className="relative">
      {/* Soft rubrication glow behind the console. */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-4xl border border-line bg-surface shadow-float">
        {/* Console title bar */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ink/60">
              {liveLabel}
            </span>
          </div>
          <span className="font-mono text-[0.7rem] text-ink/40">{fileLabel}</span>
        </div>

        {/* Waveform */}
        <div className="flex h-28 items-center justify-center gap-[3px] px-6" aria-hidden>
          {BARS.map((bar, i) => (
            <span
              key={i}
              className="wave-bar w-[3px] rounded-full bg-accent/70"
              style={{
                height: `${bar.height}px`,
                animationDelay: bar.delay,
                opacity: bar.opacity,
              }}
            />
          ))}
        </div>

        {/* Transcript */}
        <div className="border-t border-line px-6 py-5">
          <div className="mb-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink/45">
            00:04 · {listeningLabel}
          </div>
          <p className="min-h-[3.5rem] font-display text-lg leading-snug text-ink sm:text-xl">
            <span className="caret">{text}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
