import { create } from 'zustand';

export type SplitDirection = 'horizontal' | 'vertical';

export interface LayoutNode {
  type: 'terminal' | 'split';
  sessionId?: string;          // Only for type='terminal'
  direction?: SplitDirection;  // Only for type='split'
  children?: LayoutNode[];     // Only for type='split'
  ratio?: number;              // Split ratio 0-1, default 0.5
}

interface LayoutStore {
  layout: LayoutNode | null;

  // Actions
  setLayout: (layout: LayoutNode | null) => void;
  splitActive: (direction: SplitDirection, newSessionId: string) => void;
  removeFromLayout: (sessionId: string) => void;
  setSingleSession: (sessionId: string) => void;
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  layout: null,

  setLayout: (layout) => set({ layout }),

  setSingleSession: (sessionId: string) => {
    set({
      layout: { type: 'terminal', sessionId },
    });
  },

  splitActive: (direction: SplitDirection, newSessionId: string) => {
    const { layout } = get();
    if (!layout) {
      // No layout yet, just set single
      set({ layout: { type: 'terminal', sessionId: newSessionId } });
      return;
    }

    // Find the active terminal and split it
    const activeSessionId = findActiveSession(layout);
    if (!activeSessionId) {
      set({ layout: { type: 'terminal', sessionId: newSessionId } });
      return;
    }

    const newLayout = splitNode(layout, activeSessionId, direction, newSessionId);
    set({ layout: newLayout });
  },

  removeFromLayout: (sessionId: string) => {
    const { layout } = get();
    if (!layout) return;

    const newLayout = removeNode(layout, sessionId);
    set({ layout: newLayout });
  },
}));

function findActiveSession(node: LayoutNode): string | null {
  if (node.type === 'terminal') return node.sessionId || null;
  if (node.children && node.children.length > 0) {
    return findActiveSession(node.children[0]);
  }
  return null;
}

function splitNode(
  node: LayoutNode,
  targetSessionId: string,
  direction: SplitDirection,
  newSessionId: string
): LayoutNode {
  if (node.type === 'terminal' && node.sessionId === targetSessionId) {
    return {
      type: 'split',
      direction,
      ratio: 0.5,
      children: [
        { type: 'terminal', sessionId: targetSessionId },
        { type: 'terminal', sessionId: newSessionId },
      ],
    };
  }

  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: node.children.map((child) =>
        splitNode(child, targetSessionId, direction, newSessionId)
      ),
    };
  }

  return node;
}

function removeNode(node: LayoutNode, sessionId: string): LayoutNode | null {
  if (node.type === 'terminal') {
    if (node.sessionId === sessionId) return null;
    return node;
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
