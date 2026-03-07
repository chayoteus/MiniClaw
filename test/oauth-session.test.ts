import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveOAuthAccessToken } from '../src/core/oauth-session.js';
import { writeOAuthTokens } from '../src/core/token-store.js';

describe('oauth session token resolver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns stored access token when still valid', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'miniclaw-oauth-session-'));
    const env = {
      MINICLAW_OAUTH_TOKEN_PATH: join(dir, 'oauth-token.json'),
      OPENAI_OAUTH_CLIENT_ID: 'client_123',
    } as NodeJS.ProcessEnv;

    await writeOAuthTokens(
      {
        accessToken: 'stored_token',
        refreshToken: 'refresh_123',
        tokenType: 'Bearer',
        obtainedAt: '2026-03-07T00:00:00.000Z',
        expiresAt: '2026-03-07T01:00:00.000Z',
      },
      env,
    );

    const result = await resolveOAuthAccessToken(env, new Date('2026-03-07T00:10:00.000Z'));
    expect(result).toEqual({ accessToken: 'stored_token', source: 'stored' });
  });

  it('refreshes access token when expiring soon and persists new tokens', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'miniclaw-oauth-session-'));
    const env = {
      MINICLAW_OAUTH_TOKEN_PATH: join(dir, 'oauth-token.json'),
      OPENAI_OAUTH_CLIENT_ID: 'client_123',
      OPENAI_OAUTH_TOKEN_URL: 'https://auth.openai.com/oauth/token',
    } as NodeJS.ProcessEnv;

    await writeOAuthTokens(
      {
        accessToken: 'old_access',
        refreshToken: 'refresh_123',
        tokenType: 'Bearer',
        obtainedAt: '2026-03-07T00:00:00.000Z',
        expiresAt: '2026-03-07T00:00:20.000Z',
      },
      env,
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 1800,
        }),
      }),
    );

    const now = new Date('2026-03-07T00:00:00.000Z');
    const result = await resolveOAuthAccessToken(env, now);
    expect(result).toEqual({ accessToken: 'new_access', source: 'refreshed' });

    const persisted = await resolveOAuthAccessToken(env, new Date('2026-03-07T00:05:00.000Z'));
    expect(persisted).toEqual({ accessToken: 'new_access', source: 'stored' });
  });
});
