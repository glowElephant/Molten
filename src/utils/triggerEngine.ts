import { eventBus } from './eventBus';
import { useTriggerStore } from '../stores/triggerStore';
import { useNotificationStore } from '../stores/notificationStore';
import { invoke } from '@tauri-apps/api/core';
import type { TriggerAction } from '../types';
import type { TriggerMatch } from '../stores/triggerStore';

// Per-session output buffer with debounce
const buffers = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const MAX_BUFFER = 4096;

let unsubscribe: (() => void) | null = null;

function processBuffer(sessionId: string) {
  const text = buffers.get(sessionId);
  if (!text) return;
  buffers.delete(sessionId);

  const matches = useTriggerStore.getState().matchTriggers(sessionId, text);
  for (const match of matches) {
    executeActions(match, sessionId);
  }
}

function executeActions(match: TriggerMatch, sessionId: string) {
  for (const action of match.trigger.actions) {
    executeAction(action, match, sessionId);
  }
}

function executeAction(action: TriggerAction, match: TriggerMatch, sessionId: string) {
  switch (action.type) {
    case 'notification': {
      const title = (action.config.title as string) || match.trigger.name;
      const body = (action.config.body as string) || `Matched: "${match.matchText}"`;
      useNotificationStore.getState().addNotification({
        title,
        body,
        sessionId,
      });
      break;
    }
    case 'highlight': {
      // Emit event for TerminalPanel to pick up
      eventBus.emit('trigger:matched', {
        triggerId: match.trigger.id,
        sessionId,
        matchText: match.matchText,
      });
      break;
    }
    case 'command': {
      const command = action.config.command as string;
      if (!command) break;
      const targetSession = action.config.sessionId === 'self' ? sessionId : (action.config.sessionId as string || sessionId);
      invoke('pty_write', { sessionId: targetSession, data: command + '\n' }).catch(() => {});
      break;
    }
    case 'sound': {
      try {
        const audio = new Audio(action.config.file as string || 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGj6NvNbPfjQaLYy52ciFKxYxl8PesWcsHD+Wwd6ySyYhSI+31bxPHRlFk7vb0UoaGUKPu9jSSRUYQo271tJJFBhCjrvU0kkTGEKOu9PSRRIYQo270NJFERhCjrvO0kUQGEKOu83SRRAYQ4+7zNJGERlEkLvL0kYSGkWSu8nSRhMbRZK7ydJGExtFkrvH');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch { /* ignore */ }
      break;
    }
  }
}

export function initTriggerEngine() {
  if (unsubscribe) return;

  unsubscribe = eventBus.on('session:output', ({ sessionId, data }) => {
    // Accumulate output in buffer
    const existing = buffers.get(sessionId) || '';
    const newBuf = (existing + data).slice(-MAX_BUFFER);
    buffers.set(sessionId, newBuf);

    // Debounce: process after 150ms of silence
    const existingTimer = timers.get(sessionId);
    if (existingTimer) clearTimeout(existingTimer);
    timers.set(sessionId, setTimeout(() => {
      timers.delete(sessionId);
      processBuffer(sessionId);
    }, 150));
  });
}

export function destroyTriggerEngine() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  buffers.clear();
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}
