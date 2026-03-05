import type { AgentReply, AgentRunInput } from './types.js';
import { EchoModelProvider, type ModelProvider } from './model-provider.js';

export class AgentRunner {
  constructor(private readonly modelProvider: ModelProvider = new EchoModelProvider()) {}

  run(input: AgentRunInput): AgentReply {
    const text = input.inbound.text.trim();
    return {
      text: this.modelProvider.generate({
        turn: input.turn,
        inputText: text,
        history: input.history,
      }),
    };
  }
}
