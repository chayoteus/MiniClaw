import { describe, expect, it } from 'vitest';
import { AgentRunner } from '../src/core/agent-runner.js';
import { RuleModelProvider, type ModelProvider } from '../src/core/model-provider.js';

describe('AgentRunner', () => {
  it('delegates generation to model provider', () => {
    const provider: ModelProvider = {
      generate(prompt) {
        return `mock:${prompt.turn}:${prompt.inputText}:${prompt.history.length}`;
      },
    };

    const runner = new AgentRunner(provider);
    const out = runner.run({
      inbound: { channel: 'webhook', userId: 'u1', text: 'hello', ts: Date.now() },
      history: [{ role: 'user', content: 'old', ts: Date.now() }],
      turn: 3,
    });

    expect(out.text).toBe('mock:3:hello:1');
  });

  it('executes tool call emitted by model output', () => {
    const provider: ModelProvider = {
      generate() {
        return 'TOOL_CALL {"name":"text.uppercase","args":{"text":"mini"}}';
      },
    };

    const runner = new AgentRunner(provider);
    const out = runner.run({
      inbound: { channel: 'webhook', userId: 'u1', text: 'run tool', ts: Date.now() },
      history: [],
      turn: 1,
    });

    expect(out.text).toBe('[tool:text.uppercase:ok] MINI');
  });

  it('uses default echo model provider when none injected', () => {
    const runner = new AgentRunner();
    const out = runner.run({
      inbound: { channel: 'webhook', userId: 'u1', text: '', ts: Date.now() },
      history: [],
      turn: 1,
    });

    expect(out.text).toBe('MiniClaw is online.');
  });

  it('supports rule provider for tool-trigger prompts', () => {
    const runner = new AgentRunner(new RuleModelProvider());
    const out = runner.run({
      inbound: { channel: 'webhook', userId: 'u1', text: 'upper mini', ts: Date.now() },
      history: [],
      turn: 1,
    });

    expect(out.text).toBe('[tool:text.uppercase:ok] MINI');
  });
});
