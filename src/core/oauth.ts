import { createHash, randomBytes } from 'node:crypto';

const OPENAI_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize';

export interface OAuthClientConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  tokenUrl?: string;
}

export interface OAuthPkceSeed {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export type OAuthCallbackResult =
  | { ok: true; code: string; state: string }
  | { ok: false; error: string };

export interface OAuthTokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresIn?: number;
}

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

export async function exchangeAuthorizationCode(params: {
  tokenUrl: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<OAuthTokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier
  });

  const response = await fetch(params.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    throw new Error(`token_exchange_failed:${response.status}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
  };

  if (!data.access_token || !data.token_type) {
    throw new Error('token_exchange_invalid_response');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    scope: data.scope,
    expiresIn: data.expires_in
  };
}
