import { AgentRunner } from './agent-runner.js';
import type { EventBus } from './bus.js';
import { NoopEventBus } from './bus.js';
import type { SessionStore } from './session-store.js';
import type { InboundMessage } from './types.js';

export class Router {
  constructor(
    private readonly store: SessionStore,
    private readonly runner: AgentRunner,
    private readonly maxHistoryMessages = 20,
    private readonly bus: EventBus = new NoopEventBus(),
  ) {}

  handleInbound(msg: InboundMessage): { response: string; sessionId: string } {
    const sessionId = `${msg.channel}:${msg.userId}:${msg.threadId ?? 'default'}`;
    const fullHistory = this.store.getHistory(sessionId);
    const turn = fullHistory.filter((m) => m.role === 'user').length + 1;
    const history = this.maxHistoryMessages > 0 ? fullHistory.slice(-this.maxHistoryMessages) : fullHistory;

    this.store.append(sessionId, { role: 'user', content: msg.text, ts: Date.now() });
    this.bus.publish({
      topic: 'inbound.received',
      payload: { sessionId, channel: msg.channel, userId: msg.userId },
      ts: Date.now(),
    });

    const out = this.runner.run({ inbound: msg, history, turn });

    this.store.append(sessionId, { role: 'assistant', content: out.text, ts: Date.now() });
    this.bus.publish({
      topic: 'outbound.generated',
      payload: { sessionId, channel: msg.channel },
      ts: Date.now(),
    });

    return { response: out.text, sessionId };
  }
}
