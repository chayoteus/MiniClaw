import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', service: 'MiniClaw' }));

app.post('/inbound', async (req, reply) => {
  const body = req.body as Record<string, unknown>;
  const text = typeof body?.text === 'string' ? body.text : '';

  // v0.1 placeholder: echo pipeline
  const response = text ? `MiniClaw echo: ${text}` : 'MiniClaw is online.';
  return reply.send({ ok: true, response });
});

const port = Number(process.env.PORT || 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`MiniClaw listening on :${port}`);
});
