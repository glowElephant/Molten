import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Session, SessionConfig, SessionStatus, SessionMetadata } from '../types';
import { destroyTerminal } from '../utils/terminalManager';

interface SessionStore {
  sessions: Map<string, Session>;
  sessionOrder: string[];  // ordered list of all session IDs for display
  activeSessionId: string | null;

  // Actions
  createSession: (config?: SessionConfig) => string;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateStatus: (id: string, status: SessionStatus) => void;
  updateMetadata: (id: string, metadata: Partial<SessionMetadata>) => void;
  renameSession: (id: string, name: string) => void;
  reorderSessions: (fromIndex: number, toIndex: number) => void;
  restoreSession: (session: Session) => void;
  setSessionOrder: (order: string[], activeId: string | null) => void;
  getSession: (id: string) => Session | undefined;
  getActiveSessions: () => Session[];
}

let sessionCounter = 0;

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),
  sessionOrder: [],
  activeSessionId: null,

  createSession: (config?: SessionConfig) => {
    const id = generateId();
    sessionCounter++;
    const session: Session = {
      id,
      name: config?.name || `Session ${sessionCounter}`,
      status: 'idle',
      agentType: null,
      createdAt: new Date().toISOString(),
      metadata: {
        model: null,
        tokensUsed: 0,
        costUsd: 0,
        gitBranch: null,
        workingDir: config?.cwd || '',
      },
    };

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(id, session);
      return {
        sessions: newSessions,
        sessionOrder: [...state.sessionOrder, id],
        activeSessionId: id,
      };
    });

    return id;
  },

  closeSession: (id: string) => {
    // Kill the PTY process and destroy terminal UI
    invoke('pty_kill', { sessionId: id }).catch(() => {});
    destroyTerminal(id);

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(id);
      const newOrder = state.sessionOrder.filter((sid) => sid !== id);

      let newActiveId = state.activeSessionId;
      if (newActiveId === id) {
        newActiveId = newOrder.length > 0 ? newOrder[newOrder.length - 1] : null;
      }

      return {
        sessions: newSessions,
        sessionOrder: newOrder,
        activeSessionId: newActiveId,
      };
    });
  },

  setActiveSession: (id: string) => {
    set({ activeSessionId: id });
  },

  updateStatus: (id: string, status: SessionStatus) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, { ...session, status });
      return { sessions: newSessions };
    });
  },

  updateMetadata: (id: string, metadata: Partial<SessionMetadata>) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, {
        ...session,
        metadata: { ...session.metadata, ...metadata },
      });
      return { sessions: newSessions };
    });
  },

  renameSession: (id: string, name: string) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, { ...session, name });
      return { sessions: newSessions };
    });
  },

  reorderSessions: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newOrder = [...state.sessionOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return { sessionOrder: newOrder };
    });
  },

  restoreSession: (session: Session) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(session.id, session);
      return {
        sessions: newSessions,
        sessionOrder: [...state.sessionOrder, session.id],
      };
    });
    sessionCounter = Math.max(sessionCounter, get().sessions.size);
  },

  setSessionOrder: (order: string[], activeId: string | null) => {
    set({ sessionOrder: order, activeSessionId: activeId });
  },

  getSession: (id: string) => {
    return get().sessions.get(id);
  },

  getActiveSessions: () => {
    return Array.from(get().sessions.values());
  },
}));
