'use client';

/**
 * /auth/callback · recibe los tokens del login-service tras el flujo OAuth
 * --------------------------------------------------------------
 * login-service redirige aqui con ?tokens=<base64(JSON)>. Decodificamos,
 * guardamos en localStorage y redirigimos al dashboard.
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { storeTokens, type OAuthTokens } from '@/lib/auth';
import Logo from '@/components/brand/Logo';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokensB64 = searchParams.get('tokens');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!tokensB64) {
      setError('no_tokens');
      return;
    }

    try {
      const decoded = atob(tokensB64);
      const parsed = JSON.parse(decoded) as OAuthTokens;
      if (!parsed.access_token || !parsed.id_token) {
        setError('invalid_tokens');
        return;
      }
      storeTokens(parsed);
      router.replace('/dashboard');
    } catch {
      setError('decode_error');
    }
  }, [router, searchParams]);

  return (
    <main className="min-h-screen paper-grain flex flex-col items-center justify-center px-6 text-center">
      <Logo variant="ink" size="lg" />
      <div className="mt-12">
        {error ? (
          <div className="paper-card p-8 max-w-md mx-auto">
            <div className="smallcaps text-[#7E1F1F] mb-2">No se pudo iniciar sesion</div>
            <h1 className="font-serif italic text-[24px] text-[#0B1F3A] mb-3">
              Codigo de error: {error}
            </h1>
            <p className="text-[13px] text-[#3F3F3F] leading-relaxed">
              Vuelva a intentarlo o contacte al administrador del despacho si el problema persiste.
            </p>
            <a
              href="/login"
              className="btn-ghost inline-flex items-center gap-2 px-5 py-3 mt-6 text-[12px] uppercase tracking-[0.14em] rounded-[2px]"
            >
              Volver a iniciar sesion
            </a>
          </div>
        ) : (
          <>
            <div className="spin-bronze mx-auto" />
            <p className="font-serif italic text-[16px] text-[#3F3F3F] mt-6">
              Verificando credenciales...
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="spin-bronze" />
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
