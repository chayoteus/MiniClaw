import type { AgentReply, AgentRunInput } from './types.js';

export class AgentRunner {
  run(input: AgentRunInput): AgentReply {
    const text = input.inbound.text.trim();
    if (!text) return { text: 'MiniClaw is online.' };

    return { text: `Turn ${input.turn}: ${text}` };
  }
}
