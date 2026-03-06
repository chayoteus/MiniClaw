import { describe, it, expect } from 'vitest';
import { Router } from '../src/core/router.js';
import { InMemorySessionStore } from '../src/core/session-store.js';
import { AgentRunner } from '../src/core/agent-runner.js';
import { InMemoryEventBus } from '../src/core/bus.js';

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

  it('keeps turn counter stable with small history window', () => {
    const router = new Router(new InMemorySessionStore(), new AgentRunner(), 1);

    const r1 = router.handleInbound({ channel: 'webhook', userId: 'u2', text: 'a', ts: Date.now() });
    const r2 = router.handleInbound({ channel: 'webhook', userId: 'u2', text: 'b', ts: Date.now() });
    const r3 = router.handleInbound({ channel: 'webhook', userId: 'u2', text: 'c', ts: Date.now() });

    expect(r1.response).toContain('Turn 1');
    expect(r2.response).toContain('Turn 2');
    expect(r3.response).toContain('Turn 3');
  });

  it('publishes inbound and outbound events via event bus', () => {
    const bus = new InMemoryEventBus();
    const router = new Router(new InMemorySessionStore(), new AgentRunner(), 20, bus);
    const topics: string[] = [];

    bus.subscribe('inbound.received', (event) => topics.push(event.topic));
    bus.subscribe('outbound.generated', (event) => topics.push(event.topic));

    router.handleInbound({ channel: 'webhook', userId: 'u3', text: 'ping', ts: Date.now() });

    expect(topics).toEqual(['inbound.received', 'outbound.generated']);
  });
});
