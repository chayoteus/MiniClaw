import { resolveOAuthAccessToken } from './oauth-session.js';
import type { ChatMessage } from './types.js';

export type ModelPrompt = {
  turn: number;
  inputText: string;
  history: ChatMessage[];
};

export type ModelProvider = {
  generate(prompt: ModelPrompt): Promise<string>;
};

export class EchoModelProvider implements ModelProvider {
  async generate(prompt: ModelPrompt): Promise<string> {
    if (!prompt.inputText) return 'MiniClaw is online.';
    return `Turn ${prompt.turn}: ${prompt.inputText}`;
  }
}

export class RuleModelProvider implements ModelProvider {
  async generate(prompt: ModelPrompt): Promise<string> {
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

export class OpenAIOAuthModelProvider implements ModelProvider {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async generate(prompt: ModelPrompt): Promise<string> {
    if (!prompt.inputText.trim()) return 'MiniClaw is online.';

    const accessToken = (await resolveOAuthAccessToken(this.env)).accessToken;
    const apiUrl = this.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/responses';
    const model = this.env.OPENAI_MODEL ?? 'gpt-4.1-mini';

    const input = [
      ...prompt.history.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: prompt.inputText },
    ];

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ model, input }),
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`openai_response_http_${res.status}:${raw}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('openai_response_invalid_json');
    }

    const text = extractResponseText(data);
    if (!text) {
      throw new Error('openai_response_missing_text');
    }
    return text;
  }
}

function extractResponseText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const text = (data as { output_text?: unknown }).output_text;
  if (typeof text === 'string' && text.trim()) return text;

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      if ((part as { type?: string }).type !== 'output_text') continue;
      const value = (part as { text?: unknown }).text;
      if (typeof value === 'string') chunks.push(value);
    }
  }

  const combined = chunks.join('').trim();
  return combined ? combined : null;
}

export function createModelProviderFromEnv(env: NodeJS.ProcessEnv): ModelProvider {
  const mode = (env.MODEL_PROVIDER || 'echo').toLowerCase();
  if (mode === 'rule') return new RuleModelProvider();
  if (mode === 'openai-oauth') return new OpenAIOAuthModelProvider(env);
  return new EchoModelProvider();
}
