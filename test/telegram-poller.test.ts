import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelegramPoller } from '../src/adapters/telegram-poller.js';

describe('TelegramPoller', () => {
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
        json: async () => ({
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
        text: async () => '',
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
      json: async () => ({
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
});
