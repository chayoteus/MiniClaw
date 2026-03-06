export type BusEvent = {
  topic: string;
  payload: Record<string, unknown>;
  ts: number;
};

export type EventBus = {
  publish(event: BusEvent): void;
  subscribe(topic: string, handler: (event: BusEvent) => void): () => void;
};

export class InMemoryEventBus implements EventBus {
  private readonly subscribers = new Map<string, Set<(event: BusEvent) => void>>();

  publish(event: BusEvent): void {
    const handlers = this.subscribers.get(event.topic);
    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      handler(event);
    }
  }

  subscribe(topic: string, handler: (event: BusEvent) => void): () => void {
    const handlers = this.subscribers.get(topic) ?? new Set<(event: BusEvent) => void>();
    handlers.add(handler);
    this.subscribers.set(topic, handlers);

    return () => {
      const current = this.subscribers.get(topic);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.subscribers.delete(topic);
    };
  }
}

export class NoopEventBus implements EventBus {
  publish(): void {
    // no-op by design
  }

  subscribe(): () => void {
    return () => {
      // no-op by design
    };
  }
}
