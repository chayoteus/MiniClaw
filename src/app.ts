import Fastify from 'fastify';
import { z } from 'zod';
import { Router } from './core/router.js';
import { InMemorySessionStore } from './core/session-store.js';
import { AgentRunner } from './core/agent-runner.js';

const app = Fastify({ logger: true });
const router = new Router(new InMemorySessionStore(), new AgentRunner());

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
});
