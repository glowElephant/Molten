import { create } from 'zustand';
import { useSessionStore } from './sessionStore';

export type SplitDirection = 'horizontal' | 'vertical';

export interface LayoutNode {
  type: 'terminal' | 'split';
  sessionId?: string;          // Only for type='terminal'
  direction?: SplitDirection;  // Only for type='split'
  children?: LayoutNode[];     // Only for type='split', supports N children
}

export interface LayoutGroup {
  id: string;
  name: string;
  layout: LayoutNode;
  collapsed: boolean;  // sidebar UI state
}

interface LayoutStore {
  groups: LayoutGroup[];

  /** Legacy getter: returns the layout of the group containing the active session, or null */
  getActiveLayout: () => LayoutNode | null;

  /** Create a new group with a layout and return its id */
  addGroup: (name: string, layout: LayoutNode) => string;
  /** Remove a group entirely */
  removeGroup: (groupId: string) => void;
  /** Rename a group */
  renameGroup: (groupId: string, name: string) => void;
  /** Toggle collapsed state */
  toggleGroupCollapse: (groupId: string) => void;

  /** Reorder groups in the sidebar */
  reorderGroups: (fromIndex: number, toIndex: number) => void;

  /** Split the active (or target) session within its group, or create a new group if standalone */
  splitActive: (direction: SplitDirection, newSessionId: string, targetSessionId?: string | null) => void;
  /** Remove a session from whichever group contains it */
  removeFromLayout: (sessionId: string) => void;
  /** Find which group a session belongs to */
  findGroupBySession: (sessionId: string) => LayoutGroup | undefined;
  /** Collect all session IDs across all groups */
  getAllSplitSessionIds: () => Set<string>;

  /** Swap two sessions' positions within the layout tree */
  swapSessions: (sessionIdA: string, sessionIdB: string) => void;

  /** Dock a session relative to a target (top/bottom/left/right) */
  dockSession: (sourceId: string, targetId: string, position: 'top' | 'bottom' | 'left' | 'right') => void;

  /** Restore groups from saved snapshot */
  restoreGroups: (groups: LayoutGroup[]) => void;

  /** Legacy: set a single layout (replaces all groups with one) */
  setLayout: (layout: LayoutNode | null) => void;
}

let groupCounter = 0;

function generateGroupId(): string {
  groupCounter++;
  return `group-${Date.now()}-${groupCounter}`;
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  groups: [],

  getActiveLayout: () => {
    const { groups } = get();
    if (groups.length === 0) return null;
    const activeId = useSessionStore.getState().activeSessionId;
    if (!activeId) return groups.length > 0 ? groups[0].layout : null;
    const group = groups.find((g) => collectSessionIds(g.layout).includes(activeId));
    return group?.layout ?? null;
  },

  addGroup: (name: string, layout: LayoutNode) => {
    const id = generateGroupId();
    set((state) => ({
      groups: [...state.groups, { id, name, layout, collapsed: false }],
    }));
    return id;
  },

  removeGroup: (groupId: string) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
  },

  renameGroup: (groupId: string, name: string) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, name } : g
      ),
    }));
  },

  toggleGroupCollapse: (groupId: string) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
      ),
    }));
  },

  reorderGroups: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newGroups = [...state.groups];
      const [moved] = newGroups.splice(fromIndex, 1);
      newGroups.splice(toIndex, 0, moved);
      return { groups: newGroups };
    });
  },

  splitActive: (direction: SplitDirection, newSessionId: string, targetSessionId?: string | null) => {
    const { groups } = get();
    const activeId = targetSessionId || useSessionStore.getState().activeSessionId;

    if (!activeId) {
      // No active session — just create a lone terminal group
      const id = generateGroupId();
      set((state) => ({
        groups: [...state.groups, {
          id,
          name: `Split Group ${state.groups.length + 1}`,
          layout: { type: 'terminal' as const, sessionId: newSessionId },
          collapsed: false,
        }],
      }));
      return;
    }

    // Find if active session is in an existing group
    const existingGroup = groups.find((g) =>
      collectSessionIds(g.layout).includes(activeId)
    );

    if (existingGroup) {
      // Split within the existing group
      const newLayout = addToSplit(existingGroup.layout, activeId, direction, newSessionId);
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === existingGroup.id ? { ...g, layout: newLayout } : g
        ),
      }));
    } else {
      // Active session is standalone — create a new group with both sessions
      const id = generateGroupId();
      set((state) => ({
        groups: [...state.groups, {
          id,
          name: `Split Group ${state.groups.length + 1}`,
          layout: {
            type: 'split' as const,
            direction,
            children: [
              { type: 'terminal' as const, sessionId: activeId },
              { type: 'terminal' as const, sessionId: newSessionId },
            ],
          },
          collapsed: false,
        }],
      }));
    }
  },

  removeFromLayout: (sessionId: string) => {
    const { groups } = get();
    const group = groups.find((g) =>
      collectSessionIds(g.layout).includes(sessionId)
    );
    if (!group) return;

    const newLayout = removeNode(group.layout, sessionId);
    if (!newLayout) {
      // Group is now empty — remove it
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== group.id),
      }));
    } else if (newLayout.type === 'terminal') {
      // Only one session left — remove the group (session becomes standalone)
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== group.id),
      }));
    } else {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === group.id ? { ...g, layout: newLayout } : g
        ),
      }));
    }
  },

  findGroupBySession: (sessionId: string) => {
    return get().groups.find((g) =>
      collectSessionIds(g.layout).includes(sessionId)
    );
  },

  getAllSplitSessionIds: () => {
    const ids = new Set<string>();
    for (const group of get().groups) {
      for (const id of collectSessionIds(group.layout)) {
        ids.add(id);
      }
    }
    return ids;
  },

  swapSessions: (sessionIdA: string, sessionIdB: string) => {
    if (sessionIdA === sessionIdB) return;
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        layout: swapInLayout(g.layout, sessionIdA, sessionIdB),
      })),
    }));
  },

  dockSession: (sourceId: string, targetId: string, position: 'top' | 'bottom' | 'left' | 'right') => {
    if (sourceId === targetId) return;
    set((state) => {
      // 1. Remove source from the layout tree
      let newGroups = state.groups.map((g) => {
        const cleaned = removeNode(g.layout, sourceId);
        if (!cleaned) return null; // group became empty
        if (cleaned.type === 'terminal') return null; // only one left → dissolve
        return { ...g, layout: cleaned };
      }).filter((g): g is LayoutGroup => g !== null);

      // 2. Insert source relative to target
      const direction: SplitDirection = (position === 'left' || position === 'right') ? 'horizontal' : 'vertical';
      const sourceFirst = position === 'left' || position === 'top';

      newGroups = newGroups.map((g) => {
        if (!collectSessionIds(g.layout).includes(targetId)) return g;
        return { ...g, layout: dockInLayout(g.layout, targetId, sourceId, direction, sourceFirst) };
      });

      return { groups: newGroups };
    });
  },

  restoreGroups: (groups: LayoutGroup[]) => {
    set({ groups });
    groupCounter = Math.max(groupCounter, groups.length);
  },

  // Legacy setter: replaces all groups with a single group
  setLayout: (layout: LayoutNode | null) => {
    if (!layout) {
      set({ groups: [] });
      return;
    }
    // If there's exactly one group, replace its layout
    const { groups } = get();
    if (groups.length === 1) {
      set({
        groups: [{ ...groups[0], layout }],
      });
    } else {
      // Replace all with a single group
      set({
        groups: [{
          id: generateGroupId(),
          name: 'Split Group 1',
          layout,
          collapsed: false,
        }],
      });
    }
  },
}));

/**
 * Add a new terminal to the layout.
 * If the active terminal's parent split has the same direction, add as sibling (equal distribution).
 * Otherwise, wrap in a new split.
 */
function addToSplit(
  node: LayoutNode,
  activeSessionId: string,
  direction: SplitDirection,
  newSessionId: string
): LayoutNode {
  // If this is the active terminal, wrap it in a split
  if (node.type === 'terminal' && node.sessionId === activeSessionId) {
    return {
      type: 'split',
      direction,
      children: [
        { type: 'terminal', sessionId: activeSessionId },
        { type: 'terminal', sessionId: newSessionId },
      ],
    };
  }

  // If this is a split with the SAME direction, and one of its children contains the active session
  if (node.type === 'split' && node.children && node.direction === direction) {
    // Check if the active terminal is a direct child
    const activeIndex = node.children.findIndex(
      (child) => child.type === 'terminal' && child.sessionId === activeSessionId
    );

    if (activeIndex !== -1) {
      // Add new session right after the active one as a sibling (same level, equal split)
      const newChildren = [...node.children];
      newChildren.splice(activeIndex + 1, 0, {
        type: 'terminal',
        sessionId: newSessionId,
      });
      return { ...node, children: newChildren };
    }
  }

  // Recurse into children
  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: node.children.map((child) =>
        addToSplit(child, activeSessionId, direction, newSessionId)
      ),
    };
  }

  return node;
}

function removeNode(node: LayoutNode, sessionId: string): LayoutNode | null {
  if (node.type === 'terminal') {
    return node.sessionId === sessionId ? null : node;
  }

  if (node.type === 'split' && node.children) {
    const remaining = node.children
      .map((child) => removeNode(child, sessionId))
      .filter((child): child is LayoutNode => child !== null);

    if (remaining.length === 0) return null;
    if (remaining.length === 1) return remaining[0];
    return { ...node, children: remaining };
  }

  return node;
}

/** Dock sourceId next to targetId by wrapping target in a new split */
function dockInLayout(
  node: LayoutNode,
  targetId: string,
  sourceId: string,
  direction: SplitDirection,
  sourceFirst: boolean,
): LayoutNode {
  if (node.type === 'terminal' && node.sessionId === targetId) {
    const sourceNode: LayoutNode = { type: 'terminal', sessionId: sourceId };
    const targetNode: LayoutNode = { type: 'terminal', sessionId: targetId };
    return {
      type: 'split',
      direction,
      children: sourceFirst ? [sourceNode, targetNode] : [targetNode, sourceNode],
    };
  }
  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: node.children.map((child) =>
        dockInLayout(child, targetId, sourceId, direction, sourceFirst)
      ),
    };
  }
  return node;
}

/** Swap two session IDs in a layout tree */
function swapInLayout(node: LayoutNode, idA: string, idB: string): LayoutNode {
  if (node.type === 'terminal') {
    if (node.sessionId === idA) return { ...node, sessionId: idB };
    if (node.sessionId === idB) return { ...node, sessionId: idA };
    return node;
  }
  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: node.children.map((child) => swapInLayout(child, idA, idB)),
    };
  }
  return node;
}

/** Collect all sessionIds from a layout tree */
export function collectSessionIds(node: LayoutNode | null): string[] {
  if (!node) return [];
  if (node.type === 'terminal' && node.sessionId) return [node.sessionId];
  if (node.type === 'split' && node.children) {
    return node.children.flatMap(collectSessionIds);
  }
  return [];
}
