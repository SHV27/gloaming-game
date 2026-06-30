import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * A single d6 as a CSS-3D cube. The engine decides the value; the cube tumbles
 * (3 extra turns) and *settles* deterministically on that face — expo-out, with
 * a toss + squash thunk (RESEARCH §3). Honors prefers-reduced-motion.
 */

// Face value → rotation that brings that face to camera (consistent with the
// face placement below). Multiples of 360 are added for the tumble.
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const SIZE = 60;
const HALF = SIZE / 2;

function Face({ value, transform }: { value: number; transform: string }) {
  const on = new Set(PIPS[value]);
  return (
    <div
      className="absolute grid grid-cols-3 grid-rows-3 place-items-center rounded-[10px] border border-ember-deep/60 p-2"
      style={{
        width: SIZE,
        height: SIZE,
        transform,
        background:
          'radial-gradient(120% 120% at 30% 25%, var(--color-bone-hi) 0%, var(--color-bone-mid) 55%, var(--color-bone-lo) 100%)',
        boxShadow: 'inset 0 0 6px rgba(80,55,20,0.35)',
        backfaceVisibility: 'hidden',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 9,
            height: 9,
            background: on.has(i)
              ? 'radial-gradient(circle at 35% 30%, #4a3414, var(--color-bone-pip))'
              : 'transparent',
            boxShadow: on.has(i) ? 'inset 0 1px 1px rgba(0,0,0,0.5)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export function Dice({ value }: { value: number | null }) {
  const reduce = useReducedMotion();
  const spin = useRef(0);
  const [target, setTarget] = useState({ x: -20, y: 12 });
  const shown = value ?? 1;

  useEffect(() => {
    if (value == null) return;
    spin.current += reduce ? 0 : 3;
    setTarget({
      x: FACE_ROT[value].x + 360 * spin.current,
      y: FACE_ROT[value].y + 360 * spin.current,
    });
  }, [value, reduce]);

  return (
    <div style={{ perspective: 520, width: SIZE, height: SIZE }} className="relative shrink-0">
      {/* ground shadow — tightens as the die rises, so it reads as weight */}
      <motion.div
        className="absolute left-1/2 -z-10"
        style={{
          bottom: -8,
          width: SIZE * 0.8,
          height: 10,
          marginLeft: -(SIZE * 0.4),
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)',
          filter: 'blur(2px)',
        }}
        animate={reduce ? { scaleX: 1 } : { scaleX: [1, 0.6, 1, 0.85, 1], opacity: [0.5, 0.3, 0.5, 0.45, 0.5] }}
        transition={reduce ? { duration: 0.2 } : { duration: 1.1, times: [0, 0.2, 0.62, 0.82, 1], ease: [0.16, 1, 0.3, 1] }}
        key={value ?? 'idle'}
      />
      <motion.div
        className="relative"
        style={{ width: SIZE, height: SIZE, transformStyle: 'preserve-3d' }}
        animate={
          reduce
            ? { rotateX: target.x, rotateY: target.y }
            : {
                rotateX: target.x,
                rotateY: target.y,
                y: [0, -22, 0, -4, 0],
                scale: [1, 1.08, 1, 0.97, 1],
              }
        }
        transition={
          reduce
            ? { duration: 0.2 }
            : {
                rotateX: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                rotateY: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 1.1, times: [0, 0.2, 0.62, 0.82, 1], ease: [0.16, 1, 0.3, 1] },
                scale: { duration: 1.1, times: [0, 0.2, 0.62, 0.82, 1], ease: [0.16, 1, 0.3, 1] },
              }
        }
      >
        <Face value={1} transform={`translateZ(${HALF}px)`} />
        <Face value={6} transform={`rotateY(180deg) translateZ(${HALF}px)`} />
        <Face value={2} transform={`rotateY(90deg) translateZ(${HALF}px)`} />
        <Face value={5} transform={`rotateY(-90deg) translateZ(${HALF}px)`} />
        <Face value={3} transform={`rotateX(90deg) translateZ(${HALF}px)`} />
        <Face value={4} transform={`rotateX(-90deg) translateZ(${HALF}px)`} />
      </motion.div>
      <span className="sr-only">Rolled {shown}</span>
    </div>
  );
}
