# Testing Strategy

## Current test levels

### 0) Automated test suite (Vitest)

```bash
npm test
```

Current tests:
- `test/session-store.test.ts` (in-memory + sqlite persistence/limit)
- `test/router.test.ts`
- `test/app.test.ts`

### 1) Build check (mandatory)

```bash
npm run build
```

### 2) HTTP smoke test (mandatory)

```bash
curl -s localhost:8787/health
curl -s -X POST localhost:8787/inbound \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","text":"hello"}'
```

Expected:
- `health` returns `{"status":"ok",...}`
- `inbound` returns `{ ok: true, sessionId, response }`

### 3) Session continuity smoke (recommended)

Send two messages with same `userId`, verify turn increments.

### 4) SQLite persistence smoke (recommended)

```bash
export SESSION_STORE=sqlite
export SQLITE_PATH=./miniclaw.test.db
npm run dev
```

- Send one inbound message
- Restart service
- Send again with same `userId`
- Verify continuity still works and DB file exists

## Planned tests

### Unit tests

- `router`: session id construction, pipeline call sequence
- `session-store`: append/getHistory behavior
- `agent-runner`: deterministic turn behavior
- `telegram adapter`: update parsing and outbound call guards

### Integration tests

- webhook inbound -> router -> runner -> response
- telegram update -> reply send path (mock API)

## Test data guidelines

- Keep fixtures minimal
- Prefer deterministic text outputs for early stages
- Avoid network dependency in unit tests
