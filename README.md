# MiniClaw

A minimal, educational agent runtime inspired by OpenClaw.

## Goals

1. Build a useful agent that can receive messages, call tools, and reply.
2. Keep architecture simple enough for readers to understand quickly.
3. Build in public with clear milestones.

## Architecture (v0.1)

```text
Inbound
  1) Webhook: POST /inbound  OR  Telegram: getUpdates
                           |
                           v
  2) MessageOrchestrator.handleInbound(msg)
                           |
                           v
  3) Router.ingestInbound(msg)
       - builds sessionId
       - loads history from SessionStore (memory/sqlite)
       - appends user message
                           |
                           v
  4) AgentRunner.run({ inbound, history, turn })
       -> ModelProvider.generate(...)
       -> if output is TOOL_CALL, ToolRuntime.execute(...)
                           |
                           v
  5) assistant response text
                           |
                           v
  6) Router.emitAssistant(sessionId, channel, text)
       - appends assistant message
                           |
                           v
Outbound
  7a) Webhook returns JSON: { ok, traceId, sessionId, response }
  7b) Telegram adapter calls sendMessage(chat_id, response)
```

## Milestones

- [x] v0.1: message in -> model -> message out (Telegram)
- [x] v0.1.1: SQLite session memory
- [x] v0.2: tool calling loop (minimal runtime)
- [x] v0.3: mini-gateway bus abstraction + adapter/orchestrator decoupling + provider plug baseline
- [ ] v0.4: OAuth CLI login flow + real OpenAI provider integration

## Tech

- TypeScript (Node 20)
- Fastify
- SQLite (better-sqlite3)
- Zod

## Getting started

```bash
npm install
cp .env.example .env
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

## OAuth CLI flow (v0.4, in progress)

Current status:

```bash
OPENAI_OAUTH_CLIENT_ID=...
OPENAI_OAUTH_REDIRECT_URI=...
npm run cli -- auth login
```

`auth login` prints an OpenAI OAuth authorize URL and temporary PKCE values (`state`, `code_verifier`).

`auth complete` now supports manual callback paste + state verification:

```bash
miniclaw auth complete "<callback_url_from_browser>" --state "<state_from_login>" --code-verifier "<code_verifier_from_login>"
```

Current limitation: token exchange + secure local storage are still pending. `auth status` / `auth logout` are placeholders.

## Documentation

- `docs/ARCHITECTURE.md` — module map and request flow
- `docs/ROADMAP.md` — build plan by versions
- `docs/DEVELOPMENT.md` — local dev workflow
- `docs/TESTING.md` — testing strategy
