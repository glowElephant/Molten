import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from './eventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should call handler when event is emitted', () => {
    const handler = vi.fn();
    eventBus.on('session:created', handler);

    eventBus.emit('session:created', { sessionId: '123', name: 'Test' });

    expect(handler).toHaveBeenCalledWith({ sessionId: '123', name: 'Test' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple handlers for same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.on('session:created', handler1);
    eventBus.on('session:created', handler2);

    eventBus.emit('session:created', { sessionId: '123', name: 'Test' });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe when calling returned function', () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.on('session:created', handler);

    eventBus.emit('session:created', { sessionId: '1', name: 'A' });
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();

    eventBus.emit('session:created', { sessionId: '2', name: 'B' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not throw when emitting event with no handlers', () => {
    expect(() => {
      eventBus.emit('session:closed', { sessionId: '123' });
    }).not.toThrow();
  });

  it('should not propagate handler errors to other handlers', () => {
    const errorHandler = vi.fn(() => {
      throw new Error('Test error');
    });
    const normalHandler = vi.fn();

    eventBus.on('session:created', errorHandler);
    eventBus.on('session:created', normalHandler);

    eventBus.emit('session:created', { sessionId: '123', name: 'Test' });

    expect(errorHandler).toHaveBeenCalled();
    expect(normalHandler).toHaveBeenCalled();
  });

  it('should handle custom events', () => {
    const handler = vi.fn();
    eventBus.onCustom('plugin:custom-event', handler);

    eventBus.emitCustom('plugin:custom-event', { foo: 'bar' });

    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('should clear all handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.on('session:created', handler1);
    eventBus.on('session:closed', handler2);

    eventBus.clear();

    eventBus.emit('session:created', { sessionId: '1', name: 'A' });
    eventBus.emit('session:closed', { sessionId: '1' });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should remove all handlers for specific event with off()', () => {
    const handler = vi.fn();
    eventBus.on('session:created', handler);

    eventBus.off('session:created');

    eventBus.emit('session:created', { sessionId: '1', name: 'A' });
    expect(handler).not.toHaveBeenCalled();
  });
});
