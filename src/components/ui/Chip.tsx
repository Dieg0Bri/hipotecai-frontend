/**
 * Chip · sello / estado breve
 * --------------------------------------------------------------
 * Estilo "sello legal": borde fino, mayúsculas con tracking, sin
 * relleno. Usado para estado de documento, validación, etc.
 */
import { ReactNode } from 'react';

type Tone = 'navy' | 'forest' | 'amber' | 'burgundy' | 'mute' | 'bronze';

const TONE: Record<Tone, string> = {
  navy:     'chip-navy',
  forest:   'chip-forest',
  amber:    'chip-amber',
  burgundy: 'chip-burgundy',
  mute:     'chip-mute',
  bronze:   'text-[#A47148]',
};

export function Chip({
  children,
  tone = 'navy',
  icon,
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`chip ${TONE[tone]} ${className}`}>
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </span>
  );
}

export default Chip;
