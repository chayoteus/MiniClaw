import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TelegramPoller } from '../src/adapters/telegram-poller.js';

describe('TelegramPoller', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pollOnce routes inbound text and sends reply', async () => {
    const handleInbound = vi.fn().mockReturnValue({
      traceId: 't-1',
      sessionId: 'telegram:u1:default',
      response: 'pong',
      channel: 'telegram',
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            result: [
              {
                update_id: 101,
                message: {
                  message_id: 1,
                  text: 'ping',
                  chat: { id: 42, type: 'private' },
                  from: { id: 7 },
                },
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            result: { message_id: 2 },
          }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const poller = new TelegramPoller('token', { handleInbound } as any);
    await poller.pollOnce();

    expect(handleInbound).toHaveBeenCalledWith({
      channel: 'telegram',
      userId: '7',
      threadId: undefined,
      text: 'ping',
      ts: expect.any(Number),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/sendMessage');
  });

  it('pollOnce ignores updates without text message', async () => {
    const handleInbound = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: true,
          result: [
            {
              update_id: 200,
              message: {
                message_id: 2,
                chat: { id: 99, type: 'private' },
              },
            },
          ],
        }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const poller = new TelegramPoller('token', { handleInbound } as any);
    await poller.pollOnce();

    expect(handleInbound).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries update when sendMessage returns API-level failure', async () => {
    const handleInbound = vi.fn().mockReturnValue({
      response: 'pong',
      sessionId: 'telegram:u1:default',
    });
    const timeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((fn: (...args: any[]) => void) => {
        fn();
        return 0 as ReturnType<typeof setTimeout>;
      }) as any);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            result: [
              {
                update_id: 101,
                message: {
                  message_id: 1,
                  text: 'ping',
                  chat: { id: 42, type: 'private' },
                  from: { id: 7 },
                },
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: false,
            error_code: 429,
            description: 'Too Many Requests',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            result: [
              {
                update_id: 101,
                message: {
                  message_id: 1,
                  text: 'ping',
                  chat: { id: 42, type: 'private' },
                  from: { id: 7 },
                },
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            result: { message_id: 2 },
          }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const poller = new TelegramPoller('token', { handleInbound } as any);
    await poller.pollOnce();
    await poller.pollOnce();

    expect(timeoutSpy).toHaveBeenCalled();
    expect(handleInbound).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const firstGetUpdatesBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondGetUpdatesBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(firstGetUpdatesBody.offset).toBe(0);
    expect(secondGetUpdatesBody.offset).toBe(0);
  });

  it('swallows getUpdates API-level failures and keeps polling loop alive', async () => {
    const handleInbound = vi.fn();
    const timeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((fn: (...args: any[]) => void) => {
        fn();
        return 0 as ReturnType<typeof setTimeout>;
      }) as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: false,
          error_code: 401,
          description: 'Unauthorized',
        }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const poller = new TelegramPoller('token', { handleInbound } as any);
    await poller.pollOnce();

    expect(timeoutSpy).toHaveBeenCalled();
    expect(handleInbound).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
