/**
 * auth.ts · helpers de sesión OAuth en el cliente
 * --------------------------------------------------------------
 * Solo el access_token + id_token viven en localStorage.
 * El refresh_token NUNCA llega al frontend; lo guarda login-service.
 *
 * Para refrescar: POST {LOGIN_URL}/api-login/auth/refresh con el id_token
 * (aunque esté expirado), login-service lo decodifica para identificar
 * al usuario y devuelve tokens nuevos usando el refresh_token de la BDD.
 */

const TOKENS_KEY = 'hipotecai.tokens.v1';

export interface OAuthTokens {
  access_token: string;
  id_token: string;
  expiry_time: number; // ms epoch
  token_type: string;
}

export interface UserClaims {
  email: string;
  name?: string;
  picture?: string;
  sub: string;
  hd?: string; // Workspace domain
}

/* ─────────── Storage ─────────── */

export function storeTokens(tokens: OAuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function getStoredTokens(): OAuthTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as OAuthTokens) : null;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKENS_KEY);
}

/* ─────────── Inspección del id_token ─────────── */

export function decodeIdToken(idToken: string): UserClaims | null {
  try {
    const payload = idToken.split('.')[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    return decoded as UserClaims;
  } catch {
    return null;
  }
}

export function getCurrentUser(): UserClaims | null {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  return decodeIdToken(tokens.id_token);
}

/* ─────────── Estado ─────────── */

export function isAuthenticated(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;
  // ventana de gracia 60 s para evitar microcortes
  return tokens.expiry_time - 60_000 > Date.now();
}

export function isTokenExpired(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return true;
  return tokens.expiry_time <= Date.now();
}

/* ─────────── Refresh ─────────── */

export async function refreshTokens(loginServiceUrl: string): Promise<OAuthTokens | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  try {
    const resp = await fetch(`${loginServiceUrl}/api-login/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.id_token}` },
    });
    if (!resp.ok) {
      clearTokens();
      return null;
    }
    const data = await resp.json();
    const refreshed: OAuthTokens = {
      access_token: data.access_token,
      id_token: data.id_token,
      expiry_time: Date.now() + (data.expires_in ?? 3600) * 1000,
      token_type: data.token_type ?? 'Bearer',
    };
    storeTokens(refreshed);
    return refreshed;
  } catch {
    return null;
  }
}

/* ─────────── Inicio del flujo OAuth ─────────── */

export function startGoogleSignIn(loginServiceUrl: string): void {
  if (typeof window === 'undefined') return;
  const redirectUri = encodeURIComponent(window.location.origin);
  window.location.href = `${loginServiceUrl}/api-login/auth/google?redirect_uri=${redirectUri}`;
}

/* ─────────── Logout ─────────── */

export async function signOut(loginServiceUrl: string): Promise<void> {
  const tokens = getStoredTokens();
  if (tokens) {
    try {
      await fetch(`${loginServiceUrl}/api-login/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.id_token}` },
      });
    } catch {
      // ignorar — limpiamos local de todas formas
    }
  }
  clearTokens();
}
