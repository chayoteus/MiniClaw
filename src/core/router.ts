import { AgentRunner } from './agent-runner.js';
import { InMemorySessionStore } from './session-store.js';
import type { InboundMessage } from './types.js';

export class Router {
  constructor(
    private readonly store: InMemorySessionStore,
    private readonly runner: AgentRunner,
  ) {}

  handleInbound(msg: InboundMessage): { response: string; sessionId: string } {
    const sessionId = `${msg.channel}:${msg.userId}:${msg.threadId ?? 'default'}`;
    const history = this.store.getHistory(sessionId);

    this.store.append(sessionId, { role: 'user', content: msg.text, ts: Date.now() });
    const out = this.runner.run({ inbound: msg, history });
    this.store.append(sessionId, { role: 'assistant', content: out.text, ts: Date.now() });

    return { response: out.text, sessionId };
  }
}
