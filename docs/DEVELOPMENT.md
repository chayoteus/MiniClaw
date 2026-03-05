# Development Guide

## Requirements

- Node.js >= 20
- npm (or pnpm)

## Install

```bash
npm install
```

## Run (dev)

```bash
npm run dev
```

Default port: `8787` (override with `PORT`).

## Environment

Use `.env` for local development, for example:

```env
PORT=8787
TELEGRAM_BOT_TOKEN=123456:ABC...
```

## Build

```bash
npm run build
npm start
```

## Basic checks before commit

1. Type-check / build
```bash
npm run build
```

2. Smoke test HTTP endpoints
```bash
curl -s localhost:8787/health
curl -s -X POST localhost:8787/inbound \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","text":"hello"}'
```

3. If Telegram changes were made, test bot reply loop manually.

## Commit style

Use small, readable commits:
- `feat(core): ...`
- `feat(adapter): ...`
- `docs: ...`
- `test: ...`

## Rule: code-doc-test consistency

Any behavior/API change should include:
- code change
- docs update
- test/smoke update
in the same change set.
