import { describe, it, expect } from 'vitest';
import { Router } from '../src/core/router.js';
import { InMemorySessionStore } from '../src/core/session-store.js';
import { InMemoryEventBus } from '../src/core/bus.js';
import { MessageOrchestrator } from '../src/core/message-orchestrator.js';
import { AgentRunner } from '../src/core/agent-runner.js';

describe('Router', () => {
  it('builds stable session id and increments turns in inbound context', () => {
    const router = new Router(new InMemorySessionStore());

    const r1 = router.ingestInbound({
      channel: 'webhook',
      userId: 'u1',
      text: 'hello',
      ts: Date.now(),
    });
    expect(r1.sessionId).toBe('webhook:u1:default');
    expect(r1.turn).toBe(1);

    router.emitAssistant(r1.sessionId, 'webhook', 'ok');

    const r2 = router.ingestInbound({
      channel: 'webhook',
      userId: 'u1',
      text: 'again',
      ts: Date.now(),
    });
    expect(r2.sessionId).toBe('webhook:u1:default');
    expect(r2.turn).toBe(2);
  });

  it('keeps turn counter stable with small history window', () => {
    const router = new Router(new InMemorySessionStore(), 1);

    const r1 = router.ingestInbound({ channel: 'webhook', userId: 'u2', text: 'a', ts: Date.now() });
    router.emitAssistant(r1.sessionId, 'webhook', 'a1');

    const r2 = router.ingestInbound({ channel: 'webhook', userId: 'u2', text: 'b', ts: Date.now() });
    router.emitAssistant(r2.sessionId, 'webhook', 'b1');

    const r3 = router.ingestInbound({ channel: 'webhook', userId: 'u2', text: 'c', ts: Date.now() });

    expect(r1.turn).toBe(1);
    expect(r2.turn).toBe(2);
    expect(r3.turn).toBe(3);
    expect(r3.history.length).toBe(1);
  });

  it('keeps turn counter correct beyond 20 stored messages', () => {
    const router = new Router(new InMemorySessionStore());

    for (let i = 1; i <= 12; i++) {
      const inbound = router.ingestInbound({
        channel: 'webhook',
        userId: 'u-long',
        text: `u${i}`,
        ts: Date.now(),
      });
      expect(inbound.turn).toBe(i);
      router.emitAssistant(inbound.sessionId, 'webhook', `a${i}`);
    }

    const next = router.ingestInbound({
      channel: 'webhook',
      userId: 'u-long',
      text: 'u13',
      ts: Date.now(),
    });

    expect(next.turn).toBe(13);
    expect(next.history).toHaveLength(20);
    expect(next.history[0]?.content).toBe('u3');
    expect(next.history[19]?.content).toBe('a12');
  });

  it('publishes inbound and outbound events via event bus', () => {
    const bus = new InMemoryEventBus();
    const router = new Router(new InMemorySessionStore(), 20, bus);
    const topics: string[] = [];

    bus.subscribe('inbound.received', (event) => topics.push(event.topic));
    bus.subscribe('outbound.generated', (event) => topics.push(event.topic));

    const context = router.ingestInbound({ channel: 'webhook', userId: 'u3', text: 'ping', ts: Date.now() });
    router.emitAssistant(context.sessionId, 'webhook', 'pong');

    expect(topics).toEqual(['inbound.received', 'outbound.generated']);
  });
});

describe('MessageOrchestrator', () => {
  it('executes runner and emits assistant output through router', () => {
    const router = new Router(new InMemorySessionStore());
    const orchestrator = new MessageOrchestrator(router, new AgentRunner());

    const r1 = orchestrator.handleInbound({ channel: 'webhook', userId: 'u4', text: 'hello', ts: Date.now() });
    const r2 = orchestrator.handleInbound({ channel: 'webhook', userId: 'u4', text: 'again', ts: Date.now() });

    expect(r1.response).toContain('Turn 1');
    expect(r2.response).toContain('Turn 2');
  });
});
