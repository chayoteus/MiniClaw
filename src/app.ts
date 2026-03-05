import Fastify from 'fastify';
import { z } from 'zod';
import { Router } from './core/router.js';
import { InMemorySessionStore, SqliteSessionStore, type SessionStore } from './core/session-store.js';
import { AgentRunner } from './core/agent-runner.js';
import { TelegramPoller } from './adapters/telegram-poller.js';

const app = Fastify({ logger: true });

const storeMode = (process.env.SESSION_STORE || 'memory').toLowerCase();
const dbPath = process.env.SQLITE_PATH || './miniclaw.db';
const store: SessionStore = storeMode === 'sqlite' ? new SqliteSessionStore(dbPath) : new InMemorySessionStore();
const router = new Router(store, new AgentRunner());
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

const port = Number(process.env.PORT || 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`MiniClaw listening on :${port}`);
  app.log.info(`Session store: ${storeMode}${storeMode === 'sqlite' ? ` (${dbPath})` : ''}`);

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (botToken) {
    app.log.info('TELEGRAM_BOT_TOKEN detected, starting Telegram poller...');
    const poller = new TelegramPoller(botToken, router);
    poller.start().catch((err) => app.log.error({ err }, 'telegram poller stopped'));

    const shutdown = () => poller.stop();
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else {
    app.log.info('TELEGRAM_BOT_TOKEN not set; Telegram adapter disabled.');
  }
});
