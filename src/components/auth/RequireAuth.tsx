'use client';

/**
 * RequireAuth · gate de paginas autenticadas
 * --------------------------------------------------------------
 * Si no hay sesion valida, redirige a /login. Mientras tanto muestra
 * un spinner sobrio para evitar flash de contenido protegido.
 *
 * Uso (al inicio del JSX de cada pagina autenticada):
 *   return (
 *     <RequireAuth>
 *       <Navbar />
 *       ...
 *     </RequireAuth>
 *   );
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, isTokenExpired, refreshTokens } from '@/lib/auth';
import { API_URLS } from '@/lib/api';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (isAuthenticated()) {
        if (!cancelled) setReady(true);
        return;
      }

      // Token vencido pero hay restos: intentar refresh silencioso
      if (isTokenExpired() && API_URLS.login) {
        const refreshed = await refreshTokens(API_URLS.login);
        if (refreshed && !cancelled) {
          setReady(true);
          return;
        }
      }

      // No hay sesion - mandar al login con la ruta actual como retorno
      if (!cancelled) {
        const next = encodeURIComponent(pathname);
        router.replace(`/login?next=${next}`);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center paper-grain">
        <div className="text-center">
          <div className="spin-bronze mx-auto" />
          <p className="font-serif italic text-[#6B6B6B] mt-4 text-[14px]">
            Verificando sesion...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
