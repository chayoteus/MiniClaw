import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthorizeUrl,
  createPkceSeed,
  exchangeAuthorizationCode,
  parseOAuthCallback,
  refreshOAuthAccessToken
} from '../src/core/oauth.js';

describe('oauth helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates pkce seed with url-safe fields', () => {
    const seed = createPkceSeed();
    expect(seed.state.length).toBeGreaterThan(10);
    expect(seed.codeVerifier.length).toBeGreaterThan(20);
    expect(seed.codeChallenge.length).toBeGreaterThan(20);
  });

  it('builds authorize URL with required params', () => {
    const url = buildAuthorizeUrl(
      {
        clientId: 'client_123',
        redirectUri: 'https://example.com/callback',
        scope: 'openid profile'
      },
      {
        state: 'state_abc',
        codeVerifier: 'verifier_abc',
        codeChallenge: 'challenge_abc'
      }
    );

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://auth.openai.com/oauth/authorize');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('client_id')).toBe('client_123');
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
    expect(parsed.searchParams.get('scope')).toBe('openid profile');
    expect(parsed.searchParams.get('state')).toBe('state_abc');
    expect(parsed.searchParams.get('code_challenge')).toBe('challenge_abc');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('parses valid callback and verifies state', () => {
    const result = parseOAuthCallback('https://example.com/callback?code=abc123&state=state_ok', 'state_ok');
    expect(result).toEqual({ ok: true, code: 'abc123', state: 'state_ok' });
  });

  it('rejects callback with mismatched state', () => {
    const result = parseOAuthCallback('https://example.com/callback?code=abc123&state=wrong', 'state_ok');
    expect(result).toEqual({ ok: false, error: 'state_mismatch' });
  });

  it('exchanges authorization code for token set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access_123',
          refresh_token: 'refresh_123',
          token_type: 'Bearer',
          scope: 'openid',
          expires_in: 3600
        })
      })
    );

    const result = await exchangeAuthorizationCode({
      tokenUrl: 'https://auth.openai.com/oauth/token',
      clientId: 'client_123',
      redirectUri: 'https://example.com/callback',
      code: 'code_123',
      codeVerifier: 'verifier_123'
    });

    expect(result).toEqual({
      accessToken: 'access_123',
      refreshToken: 'refresh_123',
      tokenType: 'Bearer',
      scope: 'openid',
      expiresIn: 3600
    });
  });

  it('refreshes access token with refresh_token grant', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new_access_456',
        refresh_token: 'new_refresh_456',
        token_type: 'Bearer',
        expires_in: 1800
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshOAuthAccessToken({
      tokenUrl: 'https://auth.openai.com/oauth/token',
      clientId: 'client_123',
      refreshToken: 'refresh_123'
    });

    expect(result).toEqual({
      accessToken: 'new_access_456',
      refreshToken: 'new_refresh_456',
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://auth.openai.com/oauth/token');
    expect(call[1].method).toBe('POST');

    const body = call[1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('client_id')).toBe('client_123');
    expect(body.get('refresh_token')).toBe('refresh_123');
  });
});
