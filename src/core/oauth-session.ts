import { refreshOAuthAccessToken } from './oauth.js';
import { readOAuthTokens, writeOAuthTokens, type OAuthTokenSet } from './token-store.js';

const DEFAULT_EXPIRY_SKEW_SECONDS = 60;

function isTokenExpiringSoon(tokens: OAuthTokenSet, now: Date, skewSeconds = DEFAULT_EXPIRY_SKEW_SECONDS): boolean {
  if (!tokens.expiresAt) return false;
  const expiresAtMs = Date.parse(tokens.expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs - now.getTime() <= skewSeconds * 1000;
}

export async function resolveOAuthAccessToken(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): Promise<{ accessToken: string; source: 'stored' | 'refreshed' }> {
  const tokens = await readOAuthTokens(env);
  if (!tokens) {
    throw new Error('oauth_tokens_missing');
  }

  if (!isTokenExpiringSoon(tokens, now)) {
    return { accessToken: tokens.accessToken, source: 'stored' };
  }

  if (!tokens.refreshToken) {
    throw new Error('oauth_refresh_token_missing');
  }

  const clientId = env.OPENAI_OAUTH_CLIENT_ID;
  const tokenUrl = env.OPENAI_OAUTH_TOKEN_URL ?? 'https://auth.openai.com/oauth/token';

  if (!clientId) {
    throw new Error('oauth_client_id_missing');
  }

  const refreshed = await refreshOAuthAccessToken({
    tokenUrl,
    clientId,
    refreshToken: tokens.refreshToken,
  });

  const expiresAt =
    typeof refreshed.expiresIn === 'number'
      ? new Date(now.getTime() + refreshed.expiresIn * 1000).toISOString()
      : undefined;

  await writeOAuthTokens(
    {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      tokenType: refreshed.tokenType,
      scope: refreshed.scope ?? tokens.scope,
      obtainedAt: now.toISOString(),
      expiresAt,
    },
    env,
  );

  return { accessToken: refreshed.accessToken, source: 'refreshed' };
}
