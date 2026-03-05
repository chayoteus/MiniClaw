export type InboundMessage = {
  channel: 'webhook';
  userId: string;
  threadId?: string;
  text: string;
  ts: number;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  ts: number;
};

export type AgentReply = {
  text: string;
};
