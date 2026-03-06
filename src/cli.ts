#!/usr/bin/env node
import { buildAuthorizeUrl, createPkceSeed } from './core/oauth.js';

const usage = [
  'Usage:',
  '  miniclaw auth login',
  '  miniclaw auth complete <callback_url>',
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

export function runCli(argv: string[], env: NodeJS.ProcessEnv = process.env): number {
  const [group, action] = argv;

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

  if (action === 'complete' || action === 'status' || action === 'logout') {
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
