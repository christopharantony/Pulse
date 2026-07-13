'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ConfettiBurstProps {
  /** Screen position to burst from. */
  origin: { x: number; y: number };
}

const COLORS = ['bg-accent', 'bg-success', 'bg-warning', 'bg-secondary-glow'];
const PARTICLE_COUNT = 16;

/**
 * A one-shot confetti burst rendered as a fixed overlay at `origin`. Mount it (keyed) to fire; it
 * animates once and then sits invisible until the parent unmounts it. Fully skipped under
 * `prefers-reduced-motion` — it renders nothing rather than a jarring instant flash.
 */
export function ConfettiBurst({ origin }: ConfettiBurstProps) {
  const reducedMotion = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random();
        const distance = 40 + Math.random() * 60;
        return {
          id: i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          color: COLORS[i % COLORS.length],
        };
      }),
    []
  );

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-toast" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute size-1.5 rounded-full ${p.color}`}
          initial={{ x: origin.x, y: origin.y, opacity: 1, scale: 1 }}
          animate={{ x: origin.x + p.dx, y: origin.y + p.dy, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
