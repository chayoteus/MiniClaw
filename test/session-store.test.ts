import { describe, it, expect } from 'vitest';
import { rmSync } from 'node:fs';
import { InMemorySessionStore, SqliteSessionStore } from '../src/core/session-store.js';

describe('InMemorySessionStore', () => {
  it('appends and returns history in order', () => {
    const s = new InMemorySessionStore();
    s.append('sess', { role: 'user', content: 'u1', ts: 1 });
    s.append('sess', { role: 'assistant', content: 'a1', ts: 2 });

    const history = s.getHistory('sess');
    expect(history).toHaveLength(2);
    expect(history[0]?.content).toBe('u1');
    expect(history[1]?.content).toBe('a1');
  });

  it('enforces history limit', () => {
    const s = new InMemorySessionStore();
    for (let i = 0; i < 30; i++) {
      s.append('sess', { role: 'user', content: `m${i}`, ts: i });
    }
    const history = s.getHistory('sess', 5);
    expect(history).toHaveLength(5);
    expect(history[0]?.content).toBe('m25');
    expect(history[4]?.content).toBe('m29');
  });

  it('returns full history when limit is omitted', () => {
    const s = new InMemorySessionStore();
    for (let i = 0; i < 30; i++) {
      s.append('sess', { role: 'user', content: `m${i}`, ts: i });
    }
    const history = s.getHistory('sess');
    expect(history).toHaveLength(30);
    expect(history[0]?.content).toBe('m0');
    expect(history[29]?.content).toBe('m29');
  });
});

describe('SqliteSessionStore', () => {
  it('persists messages across store instances', () => {
    const dbPath = `/tmp/miniclaw-test-${Date.now()}-persist.db`;
    rmSync(dbPath, { force: true });

    const s1 = new SqliteSessionStore(dbPath);
    s1.append('sess', { role: 'user', content: 'u1', ts: 1 });
    s1.append('sess', { role: 'assistant', content: 'a1', ts: 2 });

    const s2 = new SqliteSessionStore(dbPath);
    const history = s2.getHistory('sess');

    expect(history).toHaveLength(2);
    expect(history[0]?.content).toBe('u1');
    expect(history[1]?.content).toBe('a1');

    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
  });

  it('enforces history limit with stable order', () => {
    const dbPath = `/tmp/miniclaw-test-${Date.now()}-limit.db`;
    rmSync(dbPath, { force: true });

    const s = new SqliteSessionStore(dbPath);
    for (let i = 0; i < 30; i++) {
      s.append('sess', { role: 'user', content: `m${i}`, ts: i });
    }

    const history = s.getHistory('sess', 5);
    expect(history).toHaveLength(5);
    expect(history[0]?.content).toBe('m25');
    expect(history[4]?.content).toBe('m29');

    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
  });

  it('returns full history when limit is omitted', () => {
    const dbPath = `/tmp/miniclaw-test-${Date.now()}-all.db`;
    rmSync(dbPath, { force: true });

    const s = new SqliteSessionStore(dbPath);
    for (let i = 0; i < 30; i++) {
      s.append('sess', { role: 'user', content: `m${i}`, ts: i });
    }

    const history = s.getHistory('sess');
    expect(history).toHaveLength(30);
    expect(history[0]?.content).toBe('m0');
    expect(history[29]?.content).toBe('m29');

    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
  });
});
