import type { ChatMessage } from './types.js';

export class InMemorySessionStore {
  private sessions = new Map<string, ChatMessage[]>();

  getHistory(sessionId: string, limit = 20): ChatMessage[] {
    const all = this.sessions.get(sessionId) ?? [];
    return all.slice(Math.max(0, all.length - limit));
  }

  append(sessionId: string, message: ChatMessage): void {
    const cur = this.sessions.get(sessionId) ?? [];
    cur.push(message);
    this.sessions.set(sessionId, cur);
  }
}
