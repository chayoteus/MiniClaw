import type { EventBus } from './bus.js';
import { NoopEventBus } from './bus.js';
import type { SessionStore } from './session-store.js';
import type { InboundMessage } from './types.js';

export type InboundContext = {
  sessionId: string;
  history: ReturnType<SessionStore['getHistory']>;
  turn: number;
};

export class Router {
  constructor(
    private readonly store: SessionStore,
    private readonly maxHistoryMessages = 20,
    private readonly bus: EventBus = new NoopEventBus(),
  ) {}

  ingestInbound(msg: InboundMessage): InboundContext {
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

    return { sessionId, history, turn };
  }

  emitAssistant(sessionId: string, channel: InboundMessage['channel'], text: string): void {
    this.store.append(sessionId, { role: 'assistant', content: text, ts: Date.now() });
    this.bus.publish({
      topic: 'outbound.generated',
      payload: { sessionId, channel },
      ts: Date.now(),
    });
  }
}
