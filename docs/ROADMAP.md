# MiniClaw Roadmap

## v0.1 (current)

- [x] TypeScript project scaffold
- [x] Fastify app with `/health` and `/inbound`
- [x] Core pipeline: router + session store + agent runner
- [x] Telegram long-polling adapter

## v0.1.1 (next)

- [ ] Session store interface abstraction
- [ ] SQLite-backed store implementation
- [ ] Config switch: memory vs sqlite
- [ ] Docs + tests synced with storage changes

## v0.1.2

- [ ] Agent runner context policy (history window)
- [ ] Unified error envelope across adapters/routes
- [ ] Better logging and trace IDs

## v0.2

- [ ] Model provider abstraction
- [ ] Minimal tool runtime (1-2 tools)
- [ ] Demonstrate model -> tool -> result loop

## v0.3

- [ ] Mini-gateway bus abstraction (in-memory first)
- [ ] Decouple adapters from direct runner invocation
- [ ] Prepare for pluggable channels/providers

## Non-goals (for now)

- Full OpenClaw parity
- Multi-tenant auth
- Complex plugin ecosystem
- Rich UI/dashboard
