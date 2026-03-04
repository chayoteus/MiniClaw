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

- [ ] v0.1: message in -> model -> message out (Telegram)
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
pnpm install
pnpm dev
```

(Scaffold in progress.)
