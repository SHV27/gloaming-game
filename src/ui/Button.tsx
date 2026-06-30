import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sound } from '../audio/sound';

type Variant = 'primary' | 'ghost' | 'danger' | 'beacon';

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-display text-sm tracking-wide uppercase select-none transition-colors disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night';

const variants: Record<Variant, string> = {
  primary:
    'bg-ember/15 text-ember-bright border border-ember/40 hover:bg-ember/25 hover:border-ember/70',
  beacon:
    'bg-ember text-ink border border-ember-bright shadow-[0_0_18px_-2px_var(--color-ember)] hover:bg-ember-bright',
  ghost: 'bg-white/5 text-fog border border-white/10 hover:bg-white/10 hover:text-parchment',
  danger:
    'bg-dread/15 text-dread-bright border border-dread/40 hover:bg-dread/25 hover:border-dread/70',
};

export function Button({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  className = '',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <motion.button
      type="button"
      title={title}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      onClick={() => {
        if (disabled) return;
        sound.play('ui');
        onClick?.();
      }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
