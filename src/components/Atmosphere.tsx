import { motion } from 'framer-motion';
import { BOARD_W, BOARD_H } from '../game/board';

/**
 * The world the ring-board sits in — rendered INSIDE the board SVG so it shares the
 * coordinate space and the desaturation filter. It is radial now (the board is
 * concentric): a warm hearth-glow breathes at the center (the Gate = home/hope) and
 * a cold void presses in from every edge, thickening as the dark eats the board. This
 * is what turns a graph into a *place you are trapped inside*.
 */
const CX = BOARD_W / 2;
const CY = BOARD_H / 2;

const STARS = (() => {
  let s = 9173;
  const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  return Array.from({ length: 46 }, () => {
    const a = rnd() * Math.PI * 2;
    const rad = 300 + rnd() * 210; // out near the edges, where the dark lives
    return {
      x: CX + Math.cos(a) * rad,
      y: CY + Math.sin(a) * rad,
      r: 0.5 + rnd() * 1.3,
      tw: 2 + rnd() * 4,
      d: rnd() * 4,
    };
  });
})();

export function Atmosphere({ ratio, reduce }: { ratio: number; reduce: boolean }) {
  const warmth = Math.max(0.28, 1 - ratio * 0.7); // the Gate's glow fades as the dark wins
  const voidPress = 0.4 + 0.5 * ratio; // the encroaching dark from the edges

  return (
    <g>
      <defs>
        <radialGradient id="atmo-void" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="var(--color-sky-mid)" stopOpacity="0" />
          <stop offset="62%" stopColor="var(--color-sky-bottom)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-void)" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="atmo-gate" cx="50%" cy="50%" r="34%">
          <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.5" />
          <stop offset="45%" stopColor="var(--color-ember-deep)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="atmo-fog" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-mist-veil)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-mist-veil)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* base night */}
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="var(--color-sky-bottom)" />

      {/* the warm glow of the Gate at the center — home, hope, receding */}
      <motion.rect
        x={0}
        y={0}
        width={BOARD_W}
        height={BOARD_H}
        fill="url(#atmo-gate)"
        animate={reduce ? { opacity: warmth } : { opacity: [warmth * 0.82, warmth, warmth * 0.82] }}
        transition={reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* cold stars out in the dark at the edges */}
      <g opacity={Math.max(0.3, 1 - ratio * 0.4)}>
        {STARS.map((st, i) => (
          <motion.circle
            key={i}
            cx={st.x}
            cy={st.y}
            r={st.r}
            fill="var(--color-star)"
            animate={reduce ? undefined : { opacity: [0.2, 0.85, 0.2] }}
            transition={reduce ? undefined : { duration: st.tw, repeat: Infinity, delay: st.d, ease: 'easeInOut' }}
            opacity={0.6}
            style={{ filter: st.r > 1.4 ? 'drop-shadow(0 0 3px var(--color-star))' : undefined }}
          />
        ))}
      </g>

      {/* drifting fog banks around the ring */}
      <g style={{ filter: 'blur(18px)' }} opacity={0.14 + 0.34 * ratio}>
        <motion.ellipse
          cx={CX - 180}
          cy={CY - 120}
          rx={360}
          ry={130}
          fill="url(#atmo-fog)"
          animate={reduce ? undefined : { x: [-40, 320, -40] }}
          transition={reduce ? undefined : { duration: 52, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx={CX + 200}
          cy={CY + 140}
          rx={340}
          ry={120}
          fill="url(#atmo-fog)"
          animate={reduce ? undefined : { x: [80, -360, 80] }}
          transition={reduce ? undefined : { duration: 64, repeat: Infinity, ease: 'easeInOut' }}
        />
      </g>

      {/* the void pressing in from every edge (over the ring, under the tokens) */}
      <rect
        x={0}
        y={0}
        width={BOARD_W}
        height={BOARD_H}
        fill="url(#atmo-void)"
        opacity={voidPress}
        pointerEvents="none"
      />
    </g>
  );
}
