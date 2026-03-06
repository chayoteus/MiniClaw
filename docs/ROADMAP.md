# MiniClaw Roadmap

## v0.1 (current)

- [x] TypeScript project scaffold
- [x] Fastify app with `/health` and `/inbound`
- [x] Core pipeline: router + session store + agent runner
- [x] Telegram long-polling adapter

## v0.1.1 (in progress)

- [x] Session store interface abstraction
- [x] SQLite-backed store implementation
- [x] Config switch: memory vs sqlite
- [x] Docs synced with storage changes
- [x] Add store-focused tests

## v0.1.2

- [x] Agent runner context policy (history window)
- [x] Unified error envelope across adapters/routes
- [x] Better logging and trace IDs

## v0.2

- [x] Model provider abstraction
- [x] Minimal tool runtime (1-2 tools)
- [x] Demonstrate model -> tool -> result loop

## v0.3

- [x] Mini-gateway bus abstraction (in-memory first, core pub/sub scaffold)
- [x] Decouple adapters from direct runner invocation (via MessageOrchestrator)
- [x] Prepare for pluggable channels/providers (env-selected model provider baseline)

## v0.4 (OAuth + real LLM)

- [ ] CLI auth flow: print OAuth URL (`miniclaw auth login`)
- [ ] Manual callback URL paste back into CLI (`miniclaw auth complete <callback_url>`)
- [ ] PKCE + state verification
- [ ] Access/refresh token exchange and secure local storage
- [ ] Token auto-refresh for provider calls
- [ ] OpenAI provider integration using OAuth access token
- [ ] `auth status` / `auth logout` commands
- [ ] Tests + docs for auth and provider path

## Non-goals (for now)

- Full OpenClaw parity
- Multi-tenant auth
- Complex plugin ecosystem
- Rich UI/dashboard
