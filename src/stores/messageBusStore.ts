import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';
import type { InterSessionMessage } from '../types';

const MAX_HISTORY = 200;
const MAX_OUTPUT_BUFFER = 2048;

interface MessageBusStore {
  messages: InterSessionMessage[];
  lastOutputBySession: Map<string, string>;

  sendToSession: (fromId: string, toId: string, content: string) => void;
  broadcast: (fromId: string, content: string) => void;
  recordOutput: (sessionId: string, chunk: string) => void;
  getLastOutput: (sessionId: string) => string;
  clearHistory: () => void;
}

function generateMsgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useMessageBusStore = create<MessageBusStore>((set, get) => ({
  messages: [],
  lastOutputBySession: new Map(),

  sendToSession: (fromId: string, toId: string, content: string) => {
    const msg: InterSessionMessage = {
      id: generateMsgId(),
      fromSessionId: fromId,
      toSessionId: toId,
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, msg].slice(-MAX_HISTORY),
    }));
    eventBus.emit('session:pipe-in', { toSessionId: toId, content });
  },

  broadcast: (fromId: string, content: string) => {
    const msg: InterSessionMessage = {
      id: generateMsgId(),
      fromSessionId: fromId,
      toSessionId: 'broadcast',
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, msg].slice(-MAX_HISTORY),
    }));
    eventBus.emit('session:broadcast', { content, fromSessionId: fromId });
  },

  recordOutput: (sessionId: string, chunk: string) => {
    const current = get().lastOutputBySession.get(sessionId) || '';
    const updated = (current + chunk).slice(-MAX_OUTPUT_BUFFER);
    set((state) => {
      const newMap = new Map(state.lastOutputBySession);
      newMap.set(sessionId, updated);
      return { lastOutputBySession: newMap };
    });
  },

  getLastOutput: (sessionId: string) => {
    return get().lastOutputBySession.get(sessionId) || '';
  },

  clearHistory: () => {
    set({ messages: [], lastOutputBySession: new Map() });
  },
}));
