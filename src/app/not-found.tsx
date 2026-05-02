import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import Ornament from '@/components/brand/Ornament';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen paper-grain flex flex-col items-center justify-center px-6 text-center">
      <Logo variant="ink" size="lg" />
      <Ornament tone="bronze" className="my-10 max-w-md w-full" />
      <div className="font-serif text-[80px] sm:text-[120px] leading-none text-[#0B1F3A] tracking-[-0.03em] font-light">
        404
      </div>
      <h1 className="mt-4 font-serif text-[28px] text-[#0B1F3A] italic">Folio inexistente</h1>
      <p className="mt-2 text-[14px] text-[#3F3F3F] max-w-sm">
        La carátula que busca no consta en el registro. Es posible que haya sido archivada o que la
        referencia sea incorrecta.
      </p>
      <Link
        href="/dashboard"
        className="btn-ghost mt-8 inline-flex items-center gap-2 px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium rounded-[2px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        Volver al despacho
      </Link>
    </main>
  );
}
