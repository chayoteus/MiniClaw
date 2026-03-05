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
