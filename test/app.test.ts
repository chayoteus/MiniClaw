import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app-factory.js';
import { InMemorySessionStore } from '../src/core/session-store.js';

describe('App', () => {
  it('returns health', async () => {
    const { app } = createApp(new InMemorySessionStore());
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    await app.close();
  });

  it('runs inbound pipeline', async () => {
    const { app } = createApp(new InMemorySessionStore());

    const r1 = await app.inject({
      method: 'POST',
      url: '/inbound',
      payload: { userId: 'u1', text: 'hello' },
    });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().response).toContain('Turn 1');
    expect(typeof r1.json().traceId).toBe('string');

    const r2 = await app.inject({
      method: 'POST',
      url: '/inbound',
      payload: { userId: 'u1', text: 'again' },
    });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().response).toContain('Turn 2');

    await app.close();
  });

  it('returns standardized error envelope on invalid payload', async () => {
    const { app } = createApp(new InMemorySessionStore());
    const res = await app.inject({
      method: 'POST',
      url: '/inbound',
      payload: { text: 'missing user id' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_INBOUND_PAYLOAD');
    expect(typeof body.error.message).toBe('string');

    await app.close();
  });
});
