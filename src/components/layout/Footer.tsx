/**
 * Footer · pie sobrio
 * --------------------------------------------------------------
 * Línea divisoria, créditos, año, ornamento. Sin redes ni clutter.
 */
import Logo from '@/components/brand/Logo';
import Ornament from '@/components/brand/Ornament';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 pt-12 pb-10 border-t border-[#E5DFD3] bg-[#FBF9F2]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Ornament tone="bronze" className="max-w-md mx-auto mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Logo variant="ink" size="sm" withTagline />
          <div className="text-[11px] tracking-[0.14em] uppercase text-[#6B6B6B] text-center sm:text-right">
            <p>{year} · hipotecai · Estudios hipotecarios asistidos</p>
            <p className="mt-1 text-[#A47148]">Hecho en Chile</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
