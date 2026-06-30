import type { ReactNode } from 'react';

/** Framed dusk surface — the recurring "grimoire plate" look. */
export function Panel({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border border-haze/40 bg-dusk/80 backdrop-blur-sm ${
        glow ? 'shadow-[0_0_40px_-12px_rgba(240,168,48,0.35)]' : 'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]'
      } ${className}`}
    >
      {/* hairline inner edge for the engraved feel */}
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/5" />
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-xs uppercase tracking-[0.25em] text-ember/70 text-engraved">
      {children}
    </h3>
  );
}
