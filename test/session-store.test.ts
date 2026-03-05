import { describe, it, expect } from 'vitest';
import { InMemorySessionStore } from '../src/core/session-store.js';

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
});
