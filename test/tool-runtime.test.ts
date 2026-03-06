import { describe, expect, it } from 'vitest';
import { parseToolCall, ToolRuntime } from '../src/core/tool-runtime.js';

describe('ToolRuntime', () => {
  it('executes built-in uppercase tool', () => {
    const runtime = new ToolRuntime();
    const result = runtime.execute({ name: 'text.uppercase', args: { text: 'abc' } });

    expect(result).toEqual({ ok: true, output: 'ABC' });
  });

  it('returns structured error for unknown tool', () => {
    const runtime = new ToolRuntime();
    const result = runtime.execute({ name: 'missing.tool' });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('Unknown tool: missing.tool');
  });
});

describe('parseToolCall', () => {
  it('parses valid tool call payload', () => {
    const call = parseToolCall('TOOL_CALL {"name":"time.now"}');
    expect(call).toEqual({ name: 'time.now', args: undefined });
  });

  it('returns null for normal model text', () => {
    expect(parseToolCall('hello')).toBeNull();
  });
});
