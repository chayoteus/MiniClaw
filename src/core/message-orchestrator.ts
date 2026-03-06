import { AgentRunner } from './agent-runner.js';
import { Router } from './router.js';
import type { InboundMessage } from './types.js';

export class MessageOrchestrator {
  constructor(
    private readonly router: Router,
    private readonly runner: AgentRunner,
  ) {}

  handleInbound(msg: InboundMessage): { response: string; sessionId: string } {
    const context = this.router.ingestInbound(msg);
    const out = this.runner.run({
      inbound: msg,
      history: context.history,
      turn: context.turn,
    });

    this.router.emitAssistant(context.sessionId, msg.channel, out.text);
    return { response: out.text, sessionId: context.sessionId };
  }
}
