import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutStore, collectSessionIds } from './layoutStore';
import { useSessionStore } from './sessionStore';

describe('LayoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({ groups: [] });
    useSessionStore.setState({ sessions: new Map(), activeSessionId: null });
  });

  it('should start with no groups', () => {
    expect(useLayoutStore.getState().groups).toEqual([]);
    expect(useLayoutStore.getState().getActiveLayout()).toBeNull();
  });

  it('should set layout via legacy setLayout', () => {
    useLayoutStore.getState().setLayout({ type: 'terminal', sessionId: 's1' });
    expect(useLayoutStore.getState().groups).toHaveLength(1);
    expect(useLayoutStore.getState().groups[0].layout).toEqual({ type: 'terminal', sessionId: 's1' });
  });

  it('should clear all groups with setLayout(null)', () => {
    useLayoutStore.getState().setLayout({ type: 'terminal', sessionId: 's1' });
    useLayoutStore.getState().setLayout(null);
    expect(useLayoutStore.getState().groups).toEqual([]);
  });

  it('should split active session horizontally (standalone → new group)', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });

    useLayoutStore.getState().splitActive('horizontal', 'new-session', id1);

    const { groups } = useLayoutStore.getState();
    expect(groups).toHaveLength(1);
    const layout = groups[0].layout;
    expect(layout.type).toBe('split');
    expect(layout.direction).toBe('horizontal');
    expect(layout.children).toHaveLength(2);
    expect(layout.children?.[0]).toEqual({ type: 'terminal', sessionId: id1 });
    expect(layout.children?.[1]).toEqual({ type: 'terminal', sessionId: 'new-session' });
  });

  it('should add sibling when splitting same direction within group', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });

    // Initial split: creates a group
    useLayoutStore.getState().setLayout({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: id1 },
        { type: 'terminal', sessionId: 's2' },
      ],
    });

    // Split again same direction — should become 3 panes in same group
    useLayoutStore.getState().splitActive('horizontal', 's3', id1);

    const layout = useLayoutStore.getState().groups[0].layout;
    expect(layout.children).toHaveLength(3);
    expect(layout.children?.[0].sessionId).toBe(id1);
    expect(layout.children?.[1].sessionId).toBe('s3');
    expect(layout.children?.[2].sessionId).toBe('s2');
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

    const layout = useLayoutStore.getState().groups[0].layout;
    expect(layout.direction).toBe('horizontal');
    expect(layout.children).toHaveLength(2);
    const firstChild = layout.children?.[0];
    expect(firstChild?.type).toBe('split');
    expect(firstChild?.direction).toBe('vertical');
    expect(firstChild?.children).toHaveLength(2);
  });

  it('should remove node from layout and dissolve 2-pane group', () => {
    useLayoutStore.getState().setLayout({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: 's1' },
        { type: 'terminal', sessionId: 's2' },
      ],
    });

    useLayoutStore.getState().removeFromLayout('s2');

    // Group should be dissolved (single session becomes standalone)
    expect(useLayoutStore.getState().groups).toHaveLength(0);
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

    const layout = useLayoutStore.getState().groups[0].layout;
    expect(layout.type).toBe('split');
    expect(layout.children).toHaveLength(2);
    expect(layout.children?.[0].sessionId).toBe('s1');
    expect(layout.children?.[1].sessionId).toBe('s3');
  });

  it('should remove group when last session is removed', () => {
    useLayoutStore.getState().setLayout({ type: 'terminal', sessionId: 's1' });
    useLayoutStore.getState().removeFromLayout('s1');
    expect(useLayoutStore.getState().groups).toHaveLength(0);
  });

  // Multi-group tests
  it('should create multiple groups', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });
    const id2 = useSessionStore.getState().createSession({ name: 'S2' });
    const id3 = useSessionStore.getState().createSession({ name: 'S3' });
    const id4 = useSessionStore.getState().createSession({ name: 'S4' });

    // Create first group: id1 + id2
    useSessionStore.getState().setActiveSession(id1);
    useLayoutStore.getState().splitActive('horizontal', id2, id1);

    // Create second group: id3 + id4
    useSessionStore.getState().setActiveSession(id3);
    useLayoutStore.getState().splitActive('horizontal', id4, id3);

    expect(useLayoutStore.getState().groups).toHaveLength(2);

    // Each group has 2 sessions
    const allIds = useLayoutStore.getState().getAllSplitSessionIds();
    expect(allIds.size).toBe(4);
    expect(allIds.has(id1)).toBe(true);
    expect(allIds.has(id2)).toBe(true);
    expect(allIds.has(id3)).toBe(true);
    expect(allIds.has(id4)).toBe(true);
  });

  it('should find group by session', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });
    useLayoutStore.getState().splitActive('horizontal', 'extra1', id1);

    const id2 = useSessionStore.getState().createSession({ name: 'S2' });
    useLayoutStore.getState().splitActive('vertical', 'extra2', id2);

    const group1 = useLayoutStore.getState().findGroupBySession(id1);
    const group2 = useLayoutStore.getState().findGroupBySession(id2);
    expect(group1).toBeDefined();
    expect(group2).toBeDefined();
    expect(group1?.id).not.toBe(group2?.id);
  });

  it('should rename and toggle collapse on group', () => {
    useLayoutStore.getState().addGroup('Test', { type: 'terminal', sessionId: 's1' });
    const groupId = useLayoutStore.getState().groups[0].id;

    useLayoutStore.getState().renameGroup(groupId, 'New Name');
    expect(useLayoutStore.getState().groups[0].name).toBe('New Name');

    useLayoutStore.getState().toggleGroupCollapse(groupId);
    expect(useLayoutStore.getState().groups[0].collapsed).toBe(true);

    useLayoutStore.getState().toggleGroupCollapse(groupId);
    expect(useLayoutStore.getState().groups[0].collapsed).toBe(false);
  });

  it('should get active layout based on active session', () => {
    const id1 = useSessionStore.getState().createSession({ name: 'S1' });
    const id2 = useSessionStore.getState().createSession({ name: 'S2' });

    useLayoutStore.getState().splitActive('horizontal', id2, id1);
    useSessionStore.getState().setActiveSession(id1);

    const activeLayout = useLayoutStore.getState().getActiveLayout();
    expect(activeLayout?.type).toBe('split');
    expect(collectSessionIds(activeLayout!)).toContain(id1);
    expect(collectSessionIds(activeLayout!)).toContain(id2);
  });

  it('collectSessionIds should work', () => {
    expect(collectSessionIds(null)).toEqual([]);
    expect(collectSessionIds({ type: 'terminal', sessionId: 's1' })).toEqual(['s1']);
    expect(collectSessionIds({
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'terminal', sessionId: 's1' },
        { type: 'terminal', sessionId: 's2' },
      ],
    })).toEqual(['s1', 's2']);
  });
});
