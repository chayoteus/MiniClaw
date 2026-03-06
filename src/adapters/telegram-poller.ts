import { MessageOrchestrator } from '../core/message-orchestrator.js';
import { errorEnvelope } from '../core/error-envelope.js';

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string; type: string };
    from?: { id: number | string; username?: string };
  };
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
};

export class TelegramPoller {
  private running = false;
  private offset = 0;

  constructor(
    private readonly token: string,
    private readonly orchestrator: MessageOrchestrator,
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      await this.pollOnce();
    }
  }

  async pollOnce(): Promise<void> {
    try {
      const updates = await this.getUpdates();
      for (const u of updates) {
        await this.handleUpdate(u);
        this.offset = Math.max(this.offset, u.update_id + 1);
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          traceId: `tg-poll-${Date.now()}`,
          event: 'telegram.poll.error',
          error: errorEnvelope('TELEGRAM_POLL_ERROR', 'Telegram polling loop failed', {
            cause: err instanceof Error ? err.message : String(err),
          }),
        }),
      );
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  stop(): void {
    this.running = false;
  }

  private api(path: string): string {
    return `https://api.telegram.org/bot${this.token}/${path}`;
  }

  private async getUpdates(): Promise<TelegramUpdate[]> {
    const body = {
      offset: this.offset,
      timeout: 25,
      allowed_updates: ['message'],
    };
    const res = await fetch(this.api('getUpdates'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data: TelegramApiResponse<TelegramUpdate[]> | null = null;
    try {
      data = JSON.parse(raw) as TelegramApiResponse<TelegramUpdate[]>;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(
        JSON.stringify(
          errorEnvelope('TELEGRAM_GET_UPDATES_HTTP_ERROR', `getUpdates http ${res.status}`, {
            responseText: raw,
          }),
        ),
      );
    }
    if (!data?.ok) {
      throw new Error(
        JSON.stringify(
          errorEnvelope('TELEGRAM_GET_UPDATES_API_ERROR', data?.description || 'getUpdates api error', {
            errorCode: data?.error_code,
          }),
        ),
      );
    }
    if (!Array.isArray(data.result)) return [];
    return data.result;
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const traceId = `tg-${update.update_id}`;
    const userId = String(msg.from?.id ?? msg.chat.id);
    const threadId = msg.chat.type === 'private' ? undefined : String(msg.chat.id);
    const inboundText = msg.text.length > 240 ? `${msg.text.slice(0, 240)}...` : msg.text;
    console.info(
      JSON.stringify({
        traceId,
        event: 'telegram.inbound',
        chatId: String(msg.chat.id),
        userId,
        text: inboundText,
      }),
    );

    const out = this.orchestrator.handleInbound({
      channel: 'telegram',
      userId,
      threadId,
      text: msg.text,
      ts: Date.now(),
    });

    await this.sendMessage(msg.chat.id, out.response, traceId);
  }

  private async sendMessage(chatId: number | string, text: string, traceId: string): Promise<void> {
    const res = await fetch(this.api('sendMessage'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const raw = await res.text();
    let data: TelegramApiResponse<unknown> | null = null;
    try {
      data = JSON.parse(raw) as TelegramApiResponse<unknown>;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(
        JSON.stringify(
          errorEnvelope('TELEGRAM_SEND_MESSAGE_HTTP_ERROR', `sendMessage http ${res.status}`, {
            responseText: raw,
          }),
        ),
      );
    }
    if (!data?.ok) {
      throw new Error(
        JSON.stringify(
          errorEnvelope('TELEGRAM_SEND_MESSAGE_API_ERROR', data?.description || 'sendMessage api error', {
            errorCode: data?.error_code,
          }),
        ),
      );
    }

    const outText = text.length > 240 ? `${text.slice(0, 240)}...` : text;
    console.info(
      JSON.stringify({
        traceId,
        event: 'telegram.outbound',
        chatId: String(chatId),
        text: outText,
      }),
    );
  }
}
