import { createHash, randomBytes } from 'node:crypto';

const OPENAI_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize';

export interface OAuthClientConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

export interface OAuthPkceSeed {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export type OAuthCallbackResult =
  | { ok: true; code: string; state: string }
  | { ok: false; error: string };

export function createPkceSeed(): OAuthPkceSeed {
  const state = randomBytes(16).toString('base64url');
  const codeVerifier = randomBytes(48).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { state, codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(config: OAuthClientConfig, seed: OAuthPkceSeed): string {
  const url = new URL(OPENAI_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', seed.state);
  url.searchParams.set('code_challenge', seed.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export function parseOAuthCallback(callbackUrl: string, expectedState: string): OAuthCallbackResult {
  let parsed: URL;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    return { ok: false, error: 'invalid_callback_url' };
  }

  const error = parsed.searchParams.get('error');
  if (error) {
    return { ok: false, error: `provider_error:${error}` };
  }

  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');

  if (!code) {
    return { ok: false, error: 'missing_code' };
  }
  if (!state) {
    return { ok: false, error: 'missing_state' };
  }
  if (state !== expectedState) {
    return { ok: false, error: 'state_mismatch' };
  }

  return { ok: true, code, state };
}
