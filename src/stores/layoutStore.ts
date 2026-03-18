import { create } from 'zustand';
import { useSessionStore } from './sessionStore';

export type SplitDirection = 'horizontal' | 'vertical';

export interface LayoutNode {
  type: 'terminal' | 'split';
  sessionId?: string;          // Only for type='terminal'
  direction?: SplitDirection;  // Only for type='split'
  children?: LayoutNode[];     // Only for type='split', supports N children
}

interface LayoutStore {
  layout: LayoutNode | null;

  setLayout: (layout: LayoutNode | null) => void;
  splitActive: (direction: SplitDirection, newSessionId: string) => void;
  removeFromLayout: (sessionId: string) => void;
  setSingleSession: (sessionId: string) => void;
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  layout: null,

  setLayout: (layout) => set({ layout }),

  setSingleSession: (sessionId: string) => {
    set({ layout: { type: 'terminal', sessionId } });
  },

  splitActive: (direction: SplitDirection, newSessionId: string) => {
    const { layout } = get();
    if (!layout) {
      set({ layout: { type: 'terminal', sessionId: newSessionId } });
      return;
    }

    const activeSessionId = useSessionStore.getState().activeSessionId;
    if (!activeSessionId) {
      set({ layout: { type: 'terminal', sessionId: newSessionId } });
      return;
    }

    const newLayout = addToSplit(layout, activeSessionId, direction, newSessionId);
    set({ layout: newLayout });
  },

  removeFromLayout: (sessionId: string) => {
    const { layout } = get();
    if (!layout) return;
    const newLayout = removeNode(layout, sessionId);
    set({ layout: newLayout });
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
