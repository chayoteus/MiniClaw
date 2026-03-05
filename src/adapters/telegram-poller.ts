import { Router } from '../core/router.js';

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string; type: string };
    from?: { id: number | string; username?: string };
  };
};

export class TelegramPoller {
  private running = false;
  private offset = 0;

  constructor(
    private readonly token: string,
    private readonly router: Router,
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        const updates = await this.getUpdates();
        for (const u of updates) {
          this.offset = Math.max(this.offset, u.update_id + 1);
          await this.handleUpdate(u);
        }
      } catch (err) {
        console.error('[telegram] poll error:', err);
        await new Promise((r) => setTimeout(r, 1500));
      }
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
    if (!res.ok) throw new Error(`getUpdates http ${res.status}`);
    const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
    if (!data.ok || !Array.isArray(data.result)) return [];
    return data.result;
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const userId = String(msg.from?.id ?? msg.chat.id);
    const threadId = msg.chat.type === 'private' ? undefined : String(msg.chat.id);
    const out = this.router.handleInbound({
      channel: 'telegram',
      userId,
      threadId,
      text: msg.text,
      ts: Date.now(),
    });

    await this.sendMessage(msg.chat.id, out.response);
  }

  private async sendMessage(chatId: number | string, text: string): Promise<void> {
    const res = await fetch(this.api('sendMessage'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`sendMessage http ${res.status}: ${t}`);
    }
  }
}
