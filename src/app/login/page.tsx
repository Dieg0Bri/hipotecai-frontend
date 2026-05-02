'use client';

/**
 * /login · acceso a la plataforma
 * --------------------------------------------------------------
 * Composición de dos columnas:
 *  · Izquierda: presentación de marca, manifiesto y ornamentos.
 *  · Derecha: tarjeta de acceso con SSO Google.
 * Tono notarial: papel, navy, bronce, sin estridencias.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText, ShieldCheck, FileSignature, ArrowRight } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import Ornament from '@/components/brand/Ornament';
import { isAuthenticated, startGoogleSignIn } from '@/lib/auth';
import { API_URLS } from '@/lib/api';

const PILLARS = [
  {
    icon: ScrollText,
    label: 'Lectura asistida',
    text: 'Clasificación automática de escrituras, certificados del CBR, SII y municipales.',
  },
  {
    icon: FileSignature,
    label: 'Extracción auditable',
    text: 'Cada dato extraído queda trazado al folio y línea de origen del documento.',
  },
  {
    icon: ShieldCheck,
    label: 'Verificación legal',
    text: 'Contrastes contra la normativa chilena vigente: cadena de dominio, gravámenes y restricciones.',
  },
];

export default function Login() {
  const router = useRouter();

  // Si ya hay sesion activa, ir directo al dashboard.
  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  // SSO real: redirige a login-service que arma la URL de Google y vuelve a /auth/callback
  const handleSSO = () => {
    if (!API_URLS.login) {
      alert('NEXT_PUBLIC_API_LOGIN_URL no configurada en el build del frontend.');
      return;
    }
    startGoogleSignIn(API_URLS.login);
  };

  return (
    <main className="min-h-screen relative paper-grain overflow-hidden">
      {/* esquinas decorativas tipo papel timbrado */}
      <CornerOrnaments />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* ─── Columna izquierda · Marca / manifiesto ─── */}
        <section className="hidden lg:flex flex-col justify-between p-12 xl:p-20 bg-[#0B1F3A] text-[#F8F5EE] relative overflow-hidden">
          {/* línea decorativa horizontal en navy */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#A47148] via-[#A47148]/60 to-transparent" />

          {/* fondo sutil tipográfico */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.025] select-none pointer-events-none flex items-center justify-center"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28rem',
              color: '#F8F5EE',
              fontWeight: 300,
              letterSpacing: '-0.05em',
            }}
          >
            §
          </div>

          <header className="relative">
            <Logo variant="cream" size="lg" />
            <div className="mt-2 text-[11px] tracking-[0.32em] uppercase text-[#CAB994]">
              Estudio hipotecario asistido
            </div>
          </header>

          <div className="relative max-w-lg">
            <div className="dot-rule mb-6">· · ·</div>
            <h1 className="font-serif text-[44px] xl:text-[54px] leading-[1.05] tracking-[-0.015em] font-light">
              Inteligencia documental para el{' '}
              <span className="italic text-[#C49370]">estudio hipotecario</span> chileno.
            </h1>
            <p className="mt-6 text-[15px] leading-relaxed text-[#CAB994] max-w-md">
              hipotecai asiste al abogado en la lectura, clasificación y verificación de la documentación
              de propiedades, reduciendo a horas un proceso que tradicionalmente toma días.
            </p>
          </div>

          <footer className="relative">
            <div className="grid grid-cols-1 gap-5">
              {PILLARS.map(({ icon: Icon, label, text }) => (
                <div key={label} className="flex gap-4 items-start">
                  <div className="mt-1 w-8 h-8 flex items-center justify-center border border-[#A47148]/40 rounded-[2px]">
                    <Icon className="w-4 h-4 text-[#C49370]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="smallcaps text-[#C49370]">{label}</div>
                    <p className="text-[13px] text-[#E2D9C4] leading-relaxed mt-1">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </footer>
        </section>

        {/* ─── Columna derecha · Acceso ─── */}
        <section className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 bg-[#F8F5EE]">
          <div className="lg:hidden mb-12">
            <Logo variant="ink" size="lg" />
          </div>

          <div className="max-w-md w-full mx-auto fade-up">
            {/* eyebrow */}
            <div className="smallcaps text-[#A47148] mb-3">Sesión privada</div>

            <h2 className="font-serif text-[40px] sm:text-[44px] leading-[1.05] tracking-[-0.01em] text-[#0B1F3A] font-medium">
              Iniciar sesión
            </h2>

            <p className="mt-3 text-[14px] text-[#3F3F3F] leading-relaxed">
              Acceda con su cuenta institucional. Sus credenciales nunca se almacenan en nuestros servidores.
            </p>

            <div className="my-8">
              <Ornament tone="bronze" />
            </div>

            {/* SSO */}
            <button
              onClick={handleSSO}
              className="group w-full bg-white border border-[#E5DFD3] hover:border-[#A47148] text-[#0B1F3A] flex items-center justify-center gap-3 py-3.5 rounded-[2px] transition-colors cursor-pointer"
            >
              <GoogleMark />
              <span className="text-[13px] tracking-[0.04em] font-medium">Continuar con Google</span>
            </button>

            {/* Email institucional alternativo (visual) */}
            <button
              onClick={handleSSO}
              className="group w-full mt-3 bg-[#0B1F3A] hover:bg-[#16315A] text-[#F8F5EE] flex items-center justify-center gap-3 py-3.5 rounded-[2px] transition-colors cursor-pointer"
            >
              <span className="text-[12px] uppercase tracking-[0.16em] font-medium">Acceder al despacho</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </button>

            {/* Pie legal */}
            <div className="mt-12 pt-6 border-t border-[#E5DFD3]">
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Al continuar acepta los <a href="#" className="link-ink">Términos del Servicio</a> y la{' '}
                <a href="#" className="link-ink">Política de Privacidad</a>. hipotecai cumple con la Ley 19.628 sobre
                protección de la vida privada de Chile.
              </p>
              <p className="mt-3 text-[10px] tracking-[0.18em] uppercase text-[#A47148]">
                v0 · santiago · {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ───────────────────────── helpers internos ───────────────────────── */

function CornerOrnaments() {
  // ornamentos sutiles en esquinas - inspiración: papel timbrado
  return (
    <>
      <svg
        className="hidden lg:block absolute top-6 left-6 w-12 h-12 text-[#A47148] opacity-50"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <path d="M0 24 L24 0 M0 0 L48 0 L48 48" stroke="currentColor" strokeWidth="0.7" />
      </svg>
      <svg
        className="hidden lg:block absolute bottom-6 right-6 w-12 h-12 text-[#A47148] opacity-50 rotate-180"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <path d="M0 24 L24 0 M0 0 L48 0 L48 48" stroke="currentColor" strokeWidth="0.7" />
      </svg>
    </>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
