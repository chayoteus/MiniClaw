import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresAt?: string;
  obtainedAt: string;
}

interface PersistedTokenFile {
  provider: 'openai';
  tokens: OAuthTokenSet;
}

export function defaultTokenStorePath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.MINICLAW_OAUTH_TOKEN_PATH) return env.MINICLAW_OAUTH_TOKEN_PATH;
  return join(homedir(), '.config', 'miniclaw', 'oauth-token.json');
}

export async function writeOAuthTokens(tokens: OAuthTokenSet, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const filePath = defaultTokenStorePath(env);
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true, mode: 0o700 });

  const payload: PersistedTokenFile = {
    provider: 'openai',
    tokens
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2), {
    mode: fsConstants.S_IRUSR | fsConstants.S_IWUSR
  });

  return filePath;
}

export async function readOAuthTokens(env: NodeJS.ProcessEnv = process.env): Promise<OAuthTokenSet | null> {
  const filePath = defaultTokenStorePath(env);
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as PersistedTokenFile;
    if (!parsed.tokens?.accessToken || !parsed.tokens?.tokenType || !parsed.tokens?.obtainedAt) {
      return null;
    }
    return parsed.tokens;
  } catch {
    return null;
  }
}

export async function clearOAuthTokens(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const filePath = defaultTokenStorePath(env);
  try {
    await rm(filePath);
    return true;
  } catch {
    return false;
  }
}
