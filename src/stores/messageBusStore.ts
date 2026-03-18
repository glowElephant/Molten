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
  clearOutputBuffer: (sessionId: string) => void;
  getLastOutput: (sessionId: string) => string;
  clearHistory: () => void;
}

// Strip ANSI escape sequences, control chars, and terminal noise
function stripAnsi(text: string): string {
  return text
    // Remove ANSI escape sequences (CSI, OSC, etc.)
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b[()][0-9A-B]/g, '')
    .replace(/\x1b[>=<]/g, '')
    .replace(/\x1b\[\?[0-9;]*[hlsr]/g, '')
    .replace(/\x1b\[[0-9]*[ABCDJKHS]/g, '')
    // Remove carriage returns and other control chars (keep \n)
    .replace(/\r/g, '')
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, '')
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    const clean = stripAnsi(chunk);
    if (!clean) return; // skip empty after stripping
    const current = get().lastOutputBySession.get(sessionId) || '';
    const updated = (current + clean).slice(-MAX_OUTPUT_BUFFER);
    set((state) => {
      const newMap = new Map(state.lastOutputBySession);
      newMap.set(sessionId, updated);
      return { lastOutputBySession: newMap };
    });
  },

  clearOutputBuffer: (sessionId: string) => {
    set((state) => {
      const newMap = new Map(state.lastOutputBySession);
      newMap.set(sessionId, '');
      return { lastOutputBySession: newMap };
    });
  },

  getLastOutput: (sessionId: string) => {
    const raw = get().lastOutputBySession.get(sessionId) || '';
    return stripAnsi(raw);
  },

  clearHistory: () => {
    set({ messages: [], lastOutputBySession: new Map() });
  },
}));
