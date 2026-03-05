import Fastify from 'fastify';
import { z } from 'zod';
import { Router } from './core/router.js';
import { InMemorySessionStore, SqliteSessionStore, type SessionStore } from './core/session-store.js';
import { AgentRunner } from './core/agent-runner.js';

export function createStoreFromEnv(env: NodeJS.ProcessEnv): { store: SessionStore; mode: string; dbPath?: string } {
  const mode = (env.SESSION_STORE || 'memory').toLowerCase();
  const dbPath = env.SQLITE_PATH || './miniclaw.db';
  if (mode === 'sqlite') {
    return { store: new SqliteSessionStore(dbPath), mode, dbPath };
  }
  return { store: new InMemorySessionStore(), mode };
}

export function createApp(store?: SessionStore) {
  const app = Fastify({ logger: true });
  const resolvedStore = store ?? createStoreFromEnv(process.env).store;
  const router = new Router(resolvedStore, new AgentRunner());

  app.get('/health', async () => ({ status: 'ok', service: 'MiniClaw' }));

  const inboundSchema = z.object({
    userId: z.string().min(1),
    threadId: z.string().optional(),
    text: z.string().default(''),
  });

  app.post('/inbound', async (req, reply) => {
    const parsed = inboundSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
    }

    const body = parsed.data;
    const out = router.handleInbound({
      channel: 'webhook',
      userId: body.userId,
      threadId: body.threadId,
      text: body.text,
      ts: Date.now(),
    });

    return reply.send({ ok: true, sessionId: out.sessionId, response: out.response });
  });

  return { app, router };
}
