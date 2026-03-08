# MiniClaw Architecture

MiniClaw is a minimal educational agent runtime inspired by OpenClaw.

## Design goals

1. Keep code small and readable.
2. Demonstrate core agent runtime concepts.
3. Evolve step-by-step in public.

## Current architecture (v0.1)

```text
Inbound Adapter (Webhook / Telegram Polling)
  -> Message Orchestrator
    -> Router
      -> Session Store
      -> Event Bus (in-memory)
    -> Agent Runner
  -> Outbound Adapter (Telegram send)
```

## Module map

- `src/app.ts`
  - App bootstrap, Fastify routes, adapter startup
- `src/core/types.ts`
  - Shared domain types (inbound, chat message, reply)
- `src/core/router.ts`
  - Session routing, history windowing, and event publishing
- `src/core/message-orchestrator.ts`
  - Orchestrates router ingest + agent runner + assistant emit
- `src/core/session-store.ts`
  - In-memory session history storage
- `src/core/bus.ts`
  - Event bus contract + in-memory/no-op implementations
- `src/core/model-provider.ts`
  - Async ModelProvider abstraction + env-based provider factory (`echo`/`rule`/`openai-oauth`)
- `src/core/oauth.ts`
  - OAuth PKCE helpers, callback parsing, token exchange + refresh grant helper
- `src/core/token-store.ts`
  - Local OAuth token persistence/read/clear helpers
- `src/core/oauth-session.ts`
  - Access-token resolver with auto-refresh + persisted token rotation
- `src/core/agent-runner.ts`
  - Runner that delegates text generation to ModelProvider
- `src/adapters/telegram-poller.ts`
  - Telegram getUpdates + sendMessage adapter
- `src/cli.ts`
  - `miniclaw auth` command surface (login/complete/status/logout)

## Request flow

### Webhook path

1. `POST /inbound` receives `{ userId, threadId?, text }`
2. payload validated by Zod
3. `MessageOrchestrator.handleInbound(...)` starts unified pipeline
4. `Router.ingestInbound(...)` creates `sessionId`, appends user message, publishes inbound event
5. `AgentRunner.run(...)` generates reply from turn + history
6. `Router.emitAssistant(...)` appends assistant message and publishes outbound event
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
3. forwarded to same `MessageOrchestrator.handleInbound(...)`
4. response posted to Telegram via `sendMessage`

## Session id convention

`<channel>:<userId>:<threadId|default>`

Examples:
- `webhook:u1:default`
- `telegram:123456789:default`
- `telegram:123456789:-10012345` (group/thread-like)

## Planned evolution

- Add pluggable channel adapter contract (beyond current webhook/Telegram implementations)
- Extend event bus from in-memory pub/sub into mini-gateway transport (post-v0.3)
- Add integration tests for adapter-level contracts
