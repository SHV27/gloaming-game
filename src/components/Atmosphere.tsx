import { motion } from 'framer-motion';
import { BOARD_W, BOARD_H } from '../game/board';

/**
 * The world the board sits in — rendered INSIDE the board's SVG so it shares the
 * coordinate space and the Dread desaturation filter. A cold dawn-glow hangs over
 * the Threshold (hope) and recedes as Dread climbs; ridges frame the world beyond;
 * fog drifts across the middle and thickens toward nightfall. This is what turns a
 * graph into a place.
 */

const STARS = (() => {
  let s = 9173;
  const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  return Array.from({ length: 34 }, () => ({
    x: rnd() * BOARD_W,
    y: rnd() * (BOARD_H * 0.42),
    r: 0.5 + rnd() * 1.3,
    tw: 2 + rnd() * 4,
    d: rnd() * 4,
  }));
})();

export function Atmosphere({ ratio, reduce }: { ratio: number; reduce: boolean }) {
  const hope = Math.max(0, 1 - ratio * 1.15); // the dawn recedes as night nears
  const fog = 0.16 + 0.4 * ratio; // fog thickens with Dread
  const warmth = Math.max(0.25, 1 - ratio * 0.9); // the Hearth's glow fades too

  return (
    <g>
      <defs>
        <linearGradient id="atmo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-sky-top)" />
          <stop offset="48%" stopColor="var(--color-sky-mid)" />
          <stop offset="100%" stopColor="var(--color-sky-bottom)" />
        </linearGradient>
        <radialGradient id="atmo-dawn" cx="50%" cy="0%" r="62%">
          <stop offset="0%" stopColor="var(--color-dawn)" stopOpacity="0.75" />
          <stop offset="45%" stopColor="var(--color-dawn)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-dawn)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="atmo-hearth" cx="50%" cy="100%" r="55%">
          <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.4" />
          <stop offset="60%" stopColor="var(--color-ember-deep)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="atmo-fog" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-mist-veil)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-mist-veil)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="url(#atmo-sky)" />

      {/* the cold dawn over the Threshold — hope, receding */}
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H * 0.62} fill="url(#atmo-dawn)" opacity={hope} />

      {/* stars */}
      <g opacity={Math.max(0.25, 1 - ratio * 0.6)}>
        {STARS.map((st, i) => (
          <motion.circle
            key={i}
            cx={st.x}
            cy={st.y}
            r={st.r}
            fill="var(--color-star)"
            animate={reduce ? undefined : { opacity: [0.3, 0.95, 0.3] }}
            transition={reduce ? undefined : { duration: st.tw, repeat: Infinity, delay: st.d, ease: 'easeInOut' }}
            opacity={0.7}
            style={{ filter: st.r > 1.4 ? 'drop-shadow(0 0 3px var(--color-star))' : undefined }}
          />
        ))}
      </g>

      {/* far ridges — the world beyond the Threshold, catching the dawn */}
      <path
        d={`M0,158 C150,116 280,146 420,126 C560,106 660,148 760,122 C860,98 940,134 ${BOARD_W},116 L${BOARD_W},0 L0,0 Z`}
        fill="var(--color-ridge-far)"
        opacity={0.55 * hope + 0.25}
      />
      <path
        d={`M0,196 C180,164 320,196 470,172 C640,146 770,196 910,176 L${BOARD_W},186 L${BOARD_W},0 L0,0 Z`}
        fill="var(--color-ridge-mid)"
        opacity={0.85}
      />

      {/* near earth — foreground framing the Hearth */}
      <path
        d={`M0,${BOARD_H} L0,628 C170,598 360,646 520,628 C700,608 870,650 ${BOARD_W},622 L${BOARD_W},${BOARD_H} Z`}
        fill="var(--color-ridge-near)"
      />

      {/* warm Hearth glow — home, at your back */}
      <rect x={0} y={BOARD_H * 0.5} width={BOARD_W} height={BOARD_H * 0.5} fill="url(#atmo-hearth)" opacity={warmth} />

      {/* drifting fog banks */}
      <g style={{ filter: 'blur(16px)' }} opacity={fog}>
        {/* NB: animate the x TRANSFORM, not the cx ATTRIBUTE — framer emits an
            undefined cx on first paint otherwise (an SVG console error). */}
        <motion.ellipse
          cx={300}
          cy={430}
          rx={380}
          ry={130}
          fill="url(#atmo-fog)"
          animate={reduce ? undefined : { x: [-60, 460, -60] }}
          transition={reduce ? undefined : { duration: 46, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx={720}
          cy={300}
          rx={320}
          ry={110}
          fill="url(#atmo-fog)"
          animate={reduce ? undefined : { x: [100, -460, 100] }}
          transition={reduce ? undefined : { duration: 58, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx={500}
          cy={580}
          rx={460}
          ry={120}
          fill="url(#atmo-fog)"
          animate={reduce ? undefined : { x: [60, -120, 60] }}
          transition={reduce ? undefined : { duration: 70, repeat: Infinity, ease: 'easeInOut' }}
        />
      </g>
    </g>
  );
}
