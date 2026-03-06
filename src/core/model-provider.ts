import type { ChatMessage } from './types.js';

export type ModelPrompt = {
  turn: number;
  inputText: string;
  history: ChatMessage[];
};

export type ModelProvider = {
  generate(prompt: ModelPrompt): string;
};

export class EchoModelProvider implements ModelProvider {
  generate(prompt: ModelPrompt): string {
    if (!prompt.inputText) return 'MiniClaw is online.';
    return `Turn ${prompt.turn}: ${prompt.inputText}`;
  }
}

export class RuleModelProvider implements ModelProvider {
  generate(prompt: ModelPrompt): string {
    const text = prompt.inputText.trim();
    if (!text) return 'MiniClaw is online.';

    if (text.toLowerCase().startsWith('upper ')) {
      const payload = text.slice('upper '.length).trim();
      return `TOOL_CALL ${JSON.stringify({ name: 'text.uppercase', args: { text: payload } })}`;
    }

    if (text.toLowerCase() === 'time') {
      return `TOOL_CALL ${JSON.stringify({ name: 'time.now', args: {} })}`;
    }

    return `[rule] ${text}`;
  }
}

export function createModelProviderFromEnv(env: NodeJS.ProcessEnv): ModelProvider {
  const mode = (env.MODEL_PROVIDER || 'echo').toLowerCase();
  if (mode === 'rule') return new RuleModelProvider();
  return new EchoModelProvider();
}
