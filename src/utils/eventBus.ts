import type { MoltenEventMap } from '../types';

type EventHandler<T = unknown> = (data: T) => void;
type Unsubscribe = () => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on<E extends keyof MoltenEventMap>(
    event: E,
    handler: EventHandler<MoltenEventMap[E]>
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const handlers = this.handlers.get(event)!;
    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  emit<E extends keyof MoltenEventMap>(event: E, data: MoltenEventMap[E]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for "${String(event)}":`, error);
      }
    }
  }

  /**
   * Emit a custom event (for plugins).
   */
  emitCustom(event: string, data: unknown): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in custom event handler for "${event}":`, error);
      }
    }
  }

  /**
   * Subscribe to a custom event (for plugins).
   */
  onCustom(event: string, handler: EventHandler): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const handlers = this.handlers.get(event)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  /**
   * Remove all handlers for an event.
   */
  off(event: string): void {
    this.handlers.delete(event);
  }

  /**
   * Remove all handlers for all events.
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
