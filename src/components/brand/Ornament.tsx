/**
 * Ornament · separador decorativo notarial
 * --------------------------------------------------------------
 * Línea fina con punto/rombo central, inspirada en separadores
 * de papel timbrado. Útil entre secciones formales.
 */
type OrnamentProps = {
  variant?: 'dot' | 'diamond' | 'sigil';
  className?: string;
  tone?: 'bronze' | 'navy' | 'mute';
};

const TONE = {
  bronze: 'text-[#A47148]',
  navy:   'text-[#0B1F3A]',
  mute:   'text-[#D9D1BE]',
};

export function Ornament({ variant = 'dot', className = '', tone = 'bronze' }: OrnamentProps) {
  const symbol = variant === 'diamond' ? '◆' : variant === 'sigil' ? '§' : '·';
  return (
    <div className={`legal-divider ${TONE[tone]} ${className}`}>
      <span className="ornament" style={{ color: 'currentColor' }}>{symbol}</span>
    </div>
  );
}

export default Ornament;
