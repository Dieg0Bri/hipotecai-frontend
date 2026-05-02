/**
 * Logo · Wordmark
 * --------------------------------------------------------------
 * Marca tipográfica de hipotecai. Estilo notarial sobrio:
 *   - Cormorant Garamond en peso medium para "hipotecai"
 *   - Punto ornamental dorado tras la "i" final, evocando firma
 *   - "·" entre prefijo y sufijo cuando se requiere variante extendida
 * Variantes: tono oscuro (sobre crema) y claro (sobre navy).
 */

type LogoProps = {
  variant?: 'ink' | 'cream' | 'bronze';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withTagline?: boolean;
};

const SIZE_MAP = {
  sm: { wordmark: 'text-xl', tagline: 'text-[9px]', dot: 'w-1 h-1' },
  md: { wordmark: 'text-2xl', tagline: 'text-[10px]', dot: 'w-1.5 h-1.5' },
  lg: { wordmark: 'text-4xl', tagline: 'text-[11px]', dot: 'w-2 h-2' },
  xl: { wordmark: 'text-6xl', tagline: 'text-xs', dot: 'w-2.5 h-2.5' },
};

const TONE_MAP = {
  ink:    { text: 'text-[#0B1F3A]', dot: 'bg-[#A47148]', tagline: 'text-[#6B6B6B]' },
  cream:  { text: 'text-[#F8F5EE]', dot: 'bg-[#A47148]', tagline: 'text-[#CAB994]' },
  bronze: { text: 'text-[#A47148]', dot: 'bg-[#0B1F3A]', tagline: 'text-[#6B6B6B]' },
};

export function Logo({ variant = 'ink', size = 'md', className = '', withTagline = false }: LogoProps) {
  const s = SIZE_MAP[size];
  const t = TONE_MAP[variant];

  return (
    <div className={`inline-flex flex-col leading-none ${className}`}>
      <div className="inline-flex items-end gap-[3px]">
        <span
          className={`font-serif font-medium tracking-[-0.02em] ${s.wordmark} ${t.text}`}
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          hipotecai
        </span>
        <span
          className={`${s.dot} ${t.dot} rounded-full mb-[0.18em]`}
          aria-hidden
        />
      </div>
      {withTagline && (
        <span
          className={`smallcaps mt-1.5 ${t.tagline}`}
          style={{ letterSpacing: '0.32em' }}
        >
          Estudio hipotecario asistido
        </span>
      )}
    </div>
  );
}

export default Logo;
