import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';

describe('auth cli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('complete exchanges token and stores it, then status and logout work', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'miniclaw-auth-'));
    const env = {
      OPENAI_OAUTH_CLIENT_ID: 'client_123',
      OPENAI_OAUTH_REDIRECT_URI: 'https://example.com/callback',
      MINICLAW_OAUTH_TOKEN_PATH: join(dir, 'oauth-token.json')
    } as NodeJS.ProcessEnv;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access_token_very_long',
          refresh_token: 'refresh_123',
          token_type: 'Bearer',
          expires_in: 3600
        })
      })
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const completeExit = await runCli(
      [
        'auth',
        'complete',
        'https://example.com/callback?code=code_123&state=state_123',
        '--state',
        'state_123',
        '--code-verifier',
        'verifier_123'
      ],
      env
    );
    expect(completeExit).toBe(0);

    const statusExit = await runCli(['auth', 'status'], env);
    expect(statusExit).toBe(0);

    const logoutExit = await runCli(['auth', 'logout'], env);
    expect(logoutExit).toBe(0);

    const statusAfterLogoutExit = await runCli(['auth', 'status'], env);
    expect(statusAfterLogoutExit).toBe(0);

    const messages = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(messages).toContain('OAuth token exchange succeeded and tokens saved.');
    expect(messages).toContain('Logged in with stored OAuth tokens.');
    expect(messages).toContain('Logged out. Stored OAuth tokens cleared.');
    expect(messages).toContain('Not logged in (no stored OAuth tokens).');
    expect(errSpy).not.toHaveBeenCalled();
  });
});
