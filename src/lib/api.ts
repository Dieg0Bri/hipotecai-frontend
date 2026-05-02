/**
 * api.ts · helper de fetch con auth automática y refresh
 * --------------------------------------------------------------
 * Inyecta el id_token como Bearer en cada request, y si recibe 401
 * intenta refrescar y reintentar una vez.
 */
import {
  getStoredTokens,
  isTokenExpired,
  refreshTokens,
  clearTokens,
} from './auth';

export const API_URLS = {
  login:        process.env.NEXT_PUBLIC_API_LOGIN_URL        ?? '',
  estudios:     process.env.NEXT_PUBLIC_API_ESTUDIOS_URL     ?? '',
  ingestion:    process.env.NEXT_PUBLIC_API_INGESTION_URL    ?? '',
  clasificador: process.env.NEXT_PUBLIC_API_CLASIFICADOR_URL ?? '',
  documentos:   process.env.NEXT_PUBLIC_API_DOCUMENTOS_URL   ?? '',
  sintetizador: process.env.NEXT_PUBLIC_API_SINTETIZADOR_URL ?? '',
  verificacion: process.env.NEXT_PUBLIC_API_VERIFICACION_URL ?? '',
} as const;

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

export async function authedFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let tokens = getStoredTokens();

  // refrescar proactivamente si está por expirar
  if (tokens && isTokenExpired()) {
    tokens = await refreshTokens(API_URLS.login);
    if (!tokens) throw new AuthRequiredError();
  }

  const doFetch = (currentTokens: typeof tokens) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(currentTokens
          ? { Authorization: `Bearer ${currentTokens.id_token}` }
          : {}),
      },
    });

  let response = await doFetch(tokens);

  // 401 → intentar refresh + retry una vez
  if (response.status === 401 && tokens) {
    const refreshed = await refreshTokens(API_URLS.login);
    if (!refreshed) {
      clearTokens();
      throw new AuthRequiredError();
    }
    response = await doFetch(refreshed);
  }

  return response;
}
