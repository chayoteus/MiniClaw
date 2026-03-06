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
