import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Session, SessionConfig, SessionStatus, SessionMetadata } from '../types';

interface SessionStore {
  sessions: Map<string, Session>;
  activeSessionId: string | null;

  // Actions
  createSession: (config?: SessionConfig) => string;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateStatus: (id: string, status: SessionStatus) => void;
  updateMetadata: (id: string, metadata: Partial<SessionMetadata>) => void;
  renameSession: (id: string, name: string) => void;
  getSession: (id: string) => Session | undefined;
  getActiveSessions: () => Session[];
}

let sessionCounter = 0;

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),
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
        activeSessionId: id,
      };
    });

    return id;
  },

  closeSession: (id: string) => {
    // Kill the PTY process
    invoke('pty_kill', { sessionId: id }).catch(() => {});

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(id);

      let newActiveId = state.activeSessionId;
      if (newActiveId === id) {
        const remaining = Array.from(newSessions.keys());
        newActiveId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
      }

      return {
        sessions: newSessions,
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

  getSession: (id: string) => {
    return get().sessions.get(id);
  },

  getActiveSessions: () => {
    return Array.from(get().sessions.values());
  },
}));
