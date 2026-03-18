import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutStore } from './layoutStore';
import { useSessionStore } from './sessionStore';

describe('LayoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({ layout: null });
    useSessionStore.setState({ sessions: new Map(), activeSessionId: null });
  });

  it('should start with null layout', () => {
    expect(useLayoutStore.getState().layout).toBeNull();
  });

  it('should set single session layout', () => {
    useLayoutStore.getState().setSingleSession('s1');
    const layout = useLayoutStore.getState().layout;
    expect(layout).toEqual({ type: 'terminal', sessionId: 's1' });
  });

  it('should set layout to null', () => {
    useLayoutStore.getState().setSingleSession('s1');
    useLayoutStore.getState().setLayout(null);
    expect(useLayoutStore.getState().layout).toBeNull();
  });

  it('should split active session horizontally', () => {
    // Setup: create a session and set it as active
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });
    useLayoutStore.getState().setSingleSession(id1);

    // Split
    useLayoutStore.getState().splitActive('horizontal', 'new-session', id1);

    const layout = useLayoutStore.getState().layout;
    expect(layout?.type).toBe('split');
    expect(layout?.direction).toBe('horizontal');
    expect(layout?.children).toHaveLength(2);
    expect(layout?.children?.[0]).toEqual({ type: 'terminal', sessionId: id1 });
    expect(layout?.children?.[1]).toEqual({ type: 'terminal', sessionId: 'new-session' });
  });

  it('should add sibling when splitting same direction', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });

    // Initial split: 2 panes
    useLayoutStore.getState().setLayout({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: id1 },
        { type: 'terminal', sessionId: 's2' },
      ],
    });

    // Split again same direction — should become 3 panes
    useLayoutStore.getState().splitActive('horizontal', 's3', id1);

    const layout = useLayoutStore.getState().layout;
    expect(layout?.children).toHaveLength(3);
    expect(layout?.children?.[0].sessionId).toBe(id1);
    expect(layout?.children?.[1].sessionId).toBe('s3');
    expect(layout?.children?.[2].sessionId).toBe('s2');
  });

  it('should nest when splitting different direction', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });

    useLayoutStore.getState().setLayout({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: id1 },
        { type: 'terminal', sessionId: 's2' },
      ],
    });

    // Split vertical on a horizontal parent — should nest
    useLayoutStore.getState().splitActive('vertical', 's3', id1);

    const layout = useLayoutStore.getState().layout;
    expect(layout?.direction).toBe('horizontal');
    expect(layout?.children).toHaveLength(2);
    // First child should now be a nested vertical split
    const firstChild = layout?.children?.[0];
    expect(firstChild?.type).toBe('split');
    expect(firstChild?.direction).toBe('vertical');
    expect(firstChild?.children).toHaveLength(2);
  });

  it('should remove node from layout', () => {
    useLayoutStore.getState().setLayout({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: 's1' },
        { type: 'terminal', sessionId: 's2' },
      ],
    });

    useLayoutStore.getState().removeFromLayout('s2');

    const layout = useLayoutStore.getState().layout;
    // Should collapse to single terminal
    expect(layout?.type).toBe('terminal');
    expect(layout?.sessionId).toBe('s1');
  });

  it('should handle removing from 3-way split', () => {
    useLayoutStore.getState().setLayout({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: 's1' },
        { type: 'terminal', sessionId: 's2' },
        { type: 'terminal', sessionId: 's3' },
      ],
    });

    useLayoutStore.getState().removeFromLayout('s2');

    const layout = useLayoutStore.getState().layout;
    expect(layout?.type).toBe('split');
    expect(layout?.children).toHaveLength(2);
    expect(layout?.children?.[0].sessionId).toBe('s1');
    expect(layout?.children?.[1].sessionId).toBe('s3');
  });

  it('should return null when removing last session', () => {
    useLayoutStore.getState().setSingleSession('s1');
    useLayoutStore.getState().removeFromLayout('s1');
    expect(useLayoutStore.getState().layout).toBeNull();
  });
});
