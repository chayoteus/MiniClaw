import { describe, it, expect } from 'vitest';
import { Router } from '../src/core/router.js';
import { InMemorySessionStore } from '../src/core/session-store.js';
import { AgentRunner } from '../src/core/agent-runner.js';

describe('Router', () => {
  it('builds stable session id and increments turns', () => {
    const router = new Router(new InMemorySessionStore(), new AgentRunner());

    const r1 = router.handleInbound({
      channel: 'webhook',
      userId: 'u1',
      text: 'hello',
      ts: Date.now(),
    });
    expect(r1.sessionId).toBe('webhook:u1:default');
    expect(r1.response).toContain('Turn 1');

    const r2 = router.handleInbound({
      channel: 'webhook',
      userId: 'u1',
      text: 'again',
      ts: Date.now(),
    });
    expect(r2.sessionId).toBe('webhook:u1:default');
    expect(r2.response).toContain('Turn 2');
  });
});
