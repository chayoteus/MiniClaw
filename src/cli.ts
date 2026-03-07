#!/usr/bin/env node
import { buildAuthorizeUrl, createPkceSeed, exchangeAuthorizationCode, parseOAuthCallback } from './core/oauth.js';
import { clearOAuthTokens, readOAuthTokens, writeOAuthTokens } from './core/token-store.js';

const usage = [
  'Usage:',
  '  miniclaw auth login',
  '  miniclaw auth complete <callback_url> --state <state> --code-verifier <code_verifier>',
  '  miniclaw auth status',
  '  miniclaw auth logout'
].join('\n');

function readLoginConfig(env: NodeJS.ProcessEnv): {
  clientId: string;
  redirectUri: string;
  scope: string;
  tokenUrl: string;
} {
  const clientId = env.OPENAI_OAUTH_CLIENT_ID;
  const redirectUri = env.OPENAI_OAUTH_REDIRECT_URI;
  const scope = env.OPENAI_OAUTH_SCOPE ?? 'openid profile email offline_access';
  const tokenUrl = env.OPENAI_OAUTH_TOKEN_URL ?? 'https://auth.openai.com/oauth/token';

  if (!clientId || !redirectUri) {
    throw new Error('Missing OPENAI_OAUTH_CLIENT_ID or OPENAI_OAUTH_REDIRECT_URI');
  }

  return { clientId, redirectUri, scope, tokenUrl };
}

function readFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

export async function runCli(argv: string[], env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const [group, action, ...rest] = argv;

  if (group !== 'auth' || !action) {
    console.log(usage);
    return 1;
  }

  if (action === 'login') {
    const config = readLoginConfig(env);
    const seed = createPkceSeed();
    const authorizeUrl = buildAuthorizeUrl(config, seed);

    console.log('Open this URL to authenticate:');
    console.log(authorizeUrl);
    console.log('Save these values for next step:');
    console.log(`state=${seed.state}`);
    console.log(`code_verifier=${seed.codeVerifier}`);
    return 0;
  }

  if (action === 'complete') {
    const callbackUrl = rest[0];
    const expectedState = readFlag(rest, '--state');
    const codeVerifier = readFlag(rest, '--code-verifier');

    if (!callbackUrl) {
      console.log('Missing callback URL.');
      console.log(usage);
      return 1;
    }

    if (!expectedState || !codeVerifier) {
      console.log('Missing --state or --code-verifier.');
      console.log(usage);
      return 1;
    }

    const result = parseOAuthCallback(callbackUrl, expectedState);
    if (!result.ok) {
      console.error(`OAuth callback validation failed: ${result.error}`);
      return 1;
    }

    const config = readLoginConfig(env);

    try {
      const tokenResult = await exchangeAuthorizationCode({
        tokenUrl: config.tokenUrl,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        code: result.code,
        codeVerifier
      });

      const now = new Date();
      const expiresAt =
        typeof tokenResult.expiresIn === 'number'
          ? new Date(now.getTime() + tokenResult.expiresIn * 1000).toISOString()
          : undefined;

      const path = await writeOAuthTokens(
        {
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          tokenType: tokenResult.tokenType,
          scope: tokenResult.scope,
          obtainedAt: now.toISOString(),
          expiresAt
        },
        env
      );

      console.log('OAuth token exchange succeeded and tokens saved.');
      console.log(`token_store=${path}`);
      return 0;
    } catch (error) {
      console.error(`OAuth token exchange failed: ${(error as Error).message}`);
      return 1;
    }
  }

  if (action === 'status') {
    const tokens = await readOAuthTokens(env);
    if (!tokens) {
      console.log('Not logged in (no stored OAuth tokens).');
      return 0;
    }

    const maskedAccessToken = `${tokens.accessToken.slice(0, 6)}...${tokens.accessToken.slice(-4)}`;
    console.log('Logged in with stored OAuth tokens.');
    console.log(`token_type=${tokens.tokenType}`);
    console.log(`access_token=${maskedAccessToken}`);
    if (tokens.expiresAt) console.log(`expires_at=${tokens.expiresAt}`);
    if (tokens.scope) console.log(`scope=${tokens.scope}`);
    return 0;
  }

  if (action === 'logout') {
    const removed = await clearOAuthTokens(env);
    if (removed) {
      console.log('Logged out. Stored OAuth tokens cleared.');
    } else {
      console.log('No stored OAuth tokens found.');
    }
    return 0;
  }

  console.log(usage);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
