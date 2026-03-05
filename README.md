# MiniClaw

A minimal, educational agent runtime inspired by OpenClaw.

## Goals

1. Build a useful agent that can receive messages, call tools, and reply.
2. Keep architecture simple enough for readers to understand quickly.
3. Build in public with clear milestones.

## Architecture (v0.1)

```text
Adapter (Telegram/Web)
  -> Router
    -> SessionStore (SQLite)
      -> AgentRunner
        -> ModelProvider
        -> ToolRuntime
  -> Sender
```

## Milestones

- [x] v0.1: message in -> model -> message out (Telegram)
- [ ] v0.1.1: SQLite session memory
- [ ] v0.2: tool calling loop (exec + web_search)
- [ ] v0.3: mini-gateway bus abstraction

## Tech

- TypeScript (Node 20)
- Fastify
- SQLite (better-sqlite3)
- Zod

## Getting started

```bash
npm install
npm run dev
```

## HTTP test

```bash
curl -s localhost:8787/health
curl -s -X POST localhost:8787/inbound \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","text":"hello"}'
```

## Telegram adapter (long polling)

Set bot token and run:

```bash
export TELEGRAM_BOT_TOKEN=123456:ABC...
npm run dev
```

Then message your bot in Telegram. MiniClaw will route inbound text through the same core pipeline and reply.

> Note: this is a minimal educational adapter (polling mode). Webhook + richer Telegram features can be added later.

## Documentation

- `docs/ARCHITECTURE.md` — module map and request flow
- `docs/ROADMAP.md` — build plan by versions
- `docs/DEVELOPMENT.md` — local dev workflow
- `docs/TESTING.md` — testing strategy
