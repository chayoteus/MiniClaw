# MiniClaw

A minimal, educational agent runtime inspired by OpenClaw.

## Goals

1. Build a useful agent that can receive messages, call tools, and reply.
2. Keep architecture simple enough for readers to understand quickly.
3. Build in public with clear milestones.

## Architecture (v0.1)

```text
Adapter (Telegram/Web)
  -> MessageOrchestrator
    -> Router
      -> SessionStore (SQLite)
    -> AgentRunner
      -> ModelProvider
      -> ToolRuntime
  -> Sender
```

## Milestones

- [x] v0.1: message in -> model -> message out (Telegram)
- [x] v0.1.1: SQLite session memory
- [x] v0.2: tool calling loop (minimal runtime)
- [x] v0.3: mini-gateway bus abstraction + adapter/orchestrator decoupling + provider plug baseline

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

## Test

```bash
npm run check
```

(Equivalent to `npm run build && npm test`.)

## HTTP smoke test

```bash
curl -s localhost:8787/health
curl -s -X POST localhost:8787/inbound \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","text":"hello"}'
# response now includes traceId for request-level correlation
```

## Agent context window

Default history window is 20 messages:

```bash
export AGENT_HISTORY_WINDOW=20
```

Set `0` to disable truncation and pass full history to the runner.

## Session store modes

Default is in-memory:

```bash
npm run dev
```

Use SQLite persistence:

```bash
export SESSION_STORE=sqlite
export SQLITE_PATH=./miniclaw.db
npm run dev
```

## Model provider mode (v0.3 baseline)

Default provider is `echo`:

```bash
export MODEL_PROVIDER=echo
```

Optional demo rule provider:

```bash
export MODEL_PROVIDER=rule
```

When `rule` is enabled:
- `upper hello` triggers `text.uppercase`
- `time` triggers `time.now`

## Tool calling loop (v0.2)

MiniClaw now supports a minimal tool runtime. If model output follows:

```text
TOOL_CALL {"name":"text.uppercase","args":{"text":"hello"}}
```

AgentRunner executes the tool and returns:

```text
[tool:text.uppercase:ok] HELLO
```

Built-in demo tools:

- `time.now`
- `text.uppercase`

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
