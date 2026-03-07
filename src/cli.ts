#!/usr/bin/env node
import { buildAuthorizeUrl, createPkceSeed, parseOAuthCallback } from './core/oauth.js';

const usage = [
  'Usage:',
  '  miniclaw auth login',
  '  miniclaw auth complete <callback_url> --state <state> --code-verifier <code_verifier>',
  '  miniclaw auth status',
  '  miniclaw auth logout'
].join('\n');

function readLoginConfig(env: NodeJS.ProcessEnv): { clientId: string; redirectUri: string; scope: string } {
  const clientId = env.OPENAI_OAUTH_CLIENT_ID;
  const redirectUri = env.OPENAI_OAUTH_REDIRECT_URI;
  const scope = env.OPENAI_OAUTH_SCOPE ?? 'openid profile email offline_access';

  if (!clientId || !redirectUri) {
    throw new Error('Missing OPENAI_OAUTH_CLIENT_ID or OPENAI_OAUTH_REDIRECT_URI');
  }

  return { clientId, redirectUri, scope };
}

function readFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

export function runCli(argv: string[], env: NodeJS.ProcessEnv = process.env): number {
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
    console.log('Save these values for next step (temporary, until secure token store lands):');
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

    console.log('OAuth callback validated.');
    console.log(`authorization_code=${result.code}`);
    console.log(`code_verifier=${codeVerifier}`);
    console.log('Next step: exchange code for tokens and store securely (not implemented yet).');
    return 0;
  }

  if (action === 'status' || action === 'logout') {
    console.log(`Not implemented yet: miniclaw auth ${action}`);
    return 0;
  }

  console.log(usage);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
