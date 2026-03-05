import Fastify from 'fastify';
import { z } from 'zod';
import { Router } from './core/router.js';
import { InMemorySessionStore, SqliteSessionStore, type SessionStore } from './core/session-store.js';
import { AgentRunner } from './core/agent-runner.js';
import { errorEnvelope } from './core/error-envelope.js';

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
  const maxHistoryMessages = Number.parseInt(process.env.AGENT_HISTORY_WINDOW || '20', 10);
  const router = new Router(resolvedStore, new AgentRunner(), Number.isNaN(maxHistoryMessages) ? 20 : maxHistoryMessages);

  app.get('/health', async () => ({ status: 'ok', service: 'MiniClaw' }));

  const inboundSchema = z.object({
    userId: z.string().min(1),
    threadId: z.string().optional(),
    text: z.string().default(''),
  });

  app.post('/inbound', async (req, reply) => {
    const parsed = inboundSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(errorEnvelope('INVALID_INBOUND_PAYLOAD', 'Invalid inbound payload', parsed.error.flatten()));
    }

    const body = parsed.data;
    try {
      const out = router.handleInbound({
        channel: 'webhook',
        userId: body.userId,
        threadId: body.threadId,
        text: body.text,
        ts: Date.now(),
      });

      req.log.info({ traceId: req.id, sessionId: out.sessionId, channel: 'webhook' }, 'inbound handled');
      return reply.send({ ok: true, traceId: req.id, sessionId: out.sessionId, response: out.response });
    } catch (err) {
      req.log.error({ err }, 'inbound handling failed');
      return reply.code(500).send(errorEnvelope('INTERNAL_ERROR', 'Failed to process inbound message'));
    }
  });

  return { app, router };
}
