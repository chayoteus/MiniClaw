export type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
};

export type ToolResult = {
  ok: boolean;
  output: string;
};

export type ToolHandler = (args?: Record<string, unknown>) => ToolResult;

const toStringArg = (value: unknown): string => (typeof value === 'string' ? value : '');

export class ToolRuntime {
  constructor(private readonly tools: Record<string, ToolHandler> = defaultTools) {}

  execute(call: ToolCall): ToolResult {
    const tool = this.tools[call.name];
    if (!tool) {
      return { ok: false, output: `Unknown tool: ${call.name}` };
    }

    try {
      return tool(call.args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'tool execution failed';
      return { ok: false, output: `Tool error: ${message}` };
    }
  }
}

export const defaultTools: Record<string, ToolHandler> = {
  'time.now': () => ({ ok: true, output: new Date().toISOString() }),
  'text.uppercase': (args) => {
    const text = toStringArg(args?.text);
    return { ok: true, output: text.toUpperCase() };
  },
};

export function parseToolCall(text: string): ToolCall | null {
  const raw = text.trim();
  if (!raw.startsWith('TOOL_CALL ')) return null;

  const payload = raw.slice('TOOL_CALL '.length).trim();
  if (!payload) return null;

  try {
    const data = JSON.parse(payload) as ToolCall;
    if (!data?.name || typeof data.name !== 'string') return null;
    return { name: data.name, args: data.args };
  } catch {
    return null;
  }
}
