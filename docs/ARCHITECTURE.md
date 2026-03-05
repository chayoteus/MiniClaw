# MiniClaw Architecture

MiniClaw is a minimal educational agent runtime inspired by OpenClaw.

## Design goals

1. Keep code small and readable.
2. Demonstrate core agent runtime concepts.
3. Evolve step-by-step in public.

## Current architecture (v0.1)

```text
Inbound Adapter (Webhook / Telegram Polling)
  -> Router
    -> Session Store
      -> Agent Runner
  -> Outbound Adapter (Telegram send)
```

## Module map

- `src/app.ts`
  - App bootstrap, Fastify routes, adapter startup
- `src/core/types.ts`
  - Shared domain types (inbound, chat message, reply)
- `src/core/router.ts`
  - Message orchestration and session id construction
- `src/core/session-store.ts`
  - In-memory session history storage
- `src/core/model-provider.ts`
  - ModelProvider abstraction + default EchoModelProvider
- `src/core/agent-runner.ts`
  - Runner that delegates text generation to ModelProvider
- `src/adapters/telegram-poller.ts`
  - Telegram getUpdates + sendMessage adapter

## Request flow

### Webhook path

1. `POST /inbound` receives `{ userId, threadId?, text }`
2. payload validated by Zod
3. `Router.handleInbound(...)` creates `sessionId`
4. user message appended to session store
5. `AgentRunner.run(...)` generates reply
6. assistant message appended to session store
7. response returned as JSON

Unified error contract (current, used by webhook responses and adapter error payloads):

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INBOUND_PAYLOAD",
    "message": "Invalid inbound payload",
    "details": {}
  }
}
```

### Telegram path

1. `TelegramPoller` polls `getUpdates`
2. message update normalized to `InboundMessage`
3. forwarded to same `Router.handleInbound(...)`
4. response posted to Telegram via `sendMessage`

## Session id convention

`<channel>:<userId>:<threadId|default>`

Examples:
- `webhook:u1:default`
- `telegram:123456789:default`
- `telegram:123456789:-10012345` (group/thread-like)

## Planned evolution

- Replace in-memory store with SQLite backend
- Add model provider abstraction
- Add tool runtime loop
- Introduce mini-gateway bus abstraction (v0.2)
