import type { AgentReply, AgentRunInput } from './types.js';
import { EchoModelProvider, type ModelProvider } from './model-provider.js';
import { parseToolCall, ToolRuntime } from './tool-runtime.js';

export class AgentRunner {
  constructor(
    private readonly modelProvider: ModelProvider = new EchoModelProvider(),
    private readonly toolRuntime: ToolRuntime = new ToolRuntime(),
  ) {}

  run(input: AgentRunInput): AgentReply {
    const text = input.inbound.text.trim();
    const modelOutput = this.modelProvider.generate({
      turn: input.turn,
      inputText: text,
      history: input.history,
    });

    const toolCall = parseToolCall(modelOutput);
    if (!toolCall) {
      return { text: modelOutput };
    }

    const result = this.toolRuntime.execute(toolCall);
    const status = result.ok ? 'ok' : 'error';
    return {
      text: `[tool:${toolCall.name}:${status}] ${result.output}`,
    };
  }
}
