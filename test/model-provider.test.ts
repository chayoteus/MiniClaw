import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createModelProviderFromEnv,
  EchoModelProvider,
  OpenAIOAuthModelProvider,
  RuleModelProvider,
} from '../src/core/model-provider.js';
import { writeOAuthTokens } from '../src/core/token-store.js';

describe('Model provider factory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('defaults to echo provider', () => {
    const provider = createModelProviderFromEnv({});
    expect(provider).toBeInstanceOf(EchoModelProvider);
  });

  it('uses rule provider when MODEL_PROVIDER=rule', () => {
    const provider = createModelProviderFromEnv({ MODEL_PROVIDER: 'rule' });
    expect(provider).toBeInstanceOf(RuleModelProvider);
  });

  it('uses openai oauth provider when MODEL_PROVIDER=openai-oauth', () => {
    const provider = createModelProviderFromEnv({ MODEL_PROVIDER: 'openai-oauth' });
    expect(provider).toBeInstanceOf(OpenAIOAuthModelProvider);
  });

  it('openai oauth provider calls responses api with oauth token', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'miniclaw-model-provider-'));
    const env = {
      MINICLAW_OAUTH_TOKEN_PATH: join(dir, 'oauth-token.json'),
      OPENAI_OAUTH_CLIENT_ID: 'client_123',
      OPENAI_API_URL: 'https://api.openai.com/v1/responses',
      OPENAI_MODEL: 'gpt-4.1-mini',
    } as NodeJS.ProcessEnv;

    await writeOAuthTokens(
      {
        accessToken: 'stored_access',
        refreshToken: 'refresh_123',
        tokenType: 'Bearer',
        obtainedAt: '2026-03-07T00:00:00.000Z',
      },
      env,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ output_text: 'hello from openai' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAIOAuthModelProvider(env);
    const out = await provider.generate({
      turn: 1,
      inputText: 'ping',
      history: [{ role: 'user', content: 'old', ts: Date.now() }],
    });

    expect(out).toBe('hello from openai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer stored_access');
  });
});
