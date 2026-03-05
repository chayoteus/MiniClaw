import type { AgentReply, ChatMessage, InboundMessage } from './types.js';

export class AgentRunner {
  run(input: { inbound: InboundMessage; history: ChatMessage[] }): AgentReply {
    const text = input.inbound.text.trim();
    if (!text) return { text: 'MiniClaw is online.' };

    const turn = input.history.filter((m) => m.role === 'user').length + 1;
    return { text: `Turn ${turn}: ${text}` };
  }
}
