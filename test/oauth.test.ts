import { describe, expect, it } from 'vitest';
import { buildAuthorizeUrl, createPkceSeed, parseOAuthCallback } from '../src/core/oauth.js';

describe('oauth helpers', () => {
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
});
