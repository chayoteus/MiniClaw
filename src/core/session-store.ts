import Database from 'better-sqlite3';
import type { ChatMessage } from './types.js';

export interface SessionStore {
  getHistory(sessionId: string, limit?: number): ChatMessage[];
  append(sessionId: string, message: ChatMessage): void;
}

export class InMemorySessionStore implements SessionStore {
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

export class SqliteSessionStore implements SessionStore {
  private db: Database.Database;

  constructor(path = './miniclaw.db') {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session_ts
      ON messages(session_id, ts);
    `);
  }

  getHistory(sessionId: string, limit = 20): ChatMessage[] {
    const stmt = this.db.prepare(
      `SELECT role, content, ts FROM messages
       WHERE session_id = ?
       ORDER BY ts DESC, id DESC
       LIMIT ?`,
    );
    const rows = stmt.all(sessionId, limit) as Array<{ role: string; content: string; ts: number }>;
    return rows
      .reverse()
      .map((r) => ({ role: (r.role === 'assistant' ? 'assistant' : 'user') as ChatMessage['role'], content: r.content, ts: r.ts }));
  }

  append(sessionId: string, message: ChatMessage): void {
    const stmt = this.db.prepare(
      `INSERT INTO messages (session_id, role, content, ts)
       VALUES (?, ?, ?, ?)`,
    );
    stmt.run(sessionId, message.role, message.content, message.ts);
  }
}
