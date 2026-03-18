import { create } from 'zustand';
import type { Trigger } from '../types';

interface TriggerMatch {
  trigger: Trigger;
  matchText: string;
}

interface TriggerStore {
  triggers: Trigger[];
  addTrigger: (trigger: Trigger) => void;
  updateTrigger: (id: string, partial: Partial<Trigger>) => void;
  removeTrigger: (id: string) => void;
  toggleTrigger: (id: string) => void;
  setTriggers: (triggers: Trigger[]) => void;
  matchTriggers: (sessionId: string, text: string) => TriggerMatch[];
}

// Cache compiled regexps
const regexCache = new Map<string, RegExp>();
// Track last fired times for cooldown
const lastFired = new Map<string, number>();

function getRegex(pattern: string, flags: string): RegExp | null {
  const key = `${pattern}|||${flags}`;
  let cached = regexCache.get(key);
  if (!cached) {
    try {
      cached = new RegExp(pattern, flags);
      regexCache.set(key, cached);
    } catch {
      return null;
    }
  }
  return cached;
}

function generateTriggerId(): string {
  return `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useTriggerStore = create<TriggerStore>((set, get) => ({
  triggers: [],

  addTrigger: (trigger: Trigger) => {
    set((state) => ({ triggers: [...state.triggers, trigger] }));
  },

  updateTrigger: (id: string, partial: Partial<Trigger>) => {
    set((state) => ({
      triggers: state.triggers.map((t) =>
        t.id === id ? { ...t, ...partial } : t
      ),
    }));
    // Invalidate regex cache if pattern/flags changed
    if (partial.pattern !== undefined || partial.flags !== undefined) {
      regexCache.clear();
    }
  },

  removeTrigger: (id: string) => {
    set((state) => ({
      triggers: state.triggers.filter((t) => t.id !== id),
    }));
    lastFired.delete(id);
  },

  toggleTrigger: (id: string) => {
    set((state) => ({
      triggers: state.triggers.map((t) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t
      ),
    }));
  },

  setTriggers: (triggers: Trigger[]) => {
    set({ triggers });
    regexCache.clear();
    lastFired.clear();
  },

  matchTriggers: (sessionId: string, text: string) => {
    const { triggers } = get();
    const matches: TriggerMatch[] = [];
    const now = Date.now();

    for (const trigger of triggers) {
      if (!trigger.enabled) continue;
      if (!trigger.pattern) continue; // skip empty patterns
      if (trigger.scope !== 'global' && trigger.scope !== sessionId) continue;

      // Cooldown check
      if (trigger.cooldownMs > 0) {
        const last = lastFired.get(trigger.id) || 0;
        if (now - last < trigger.cooldownMs) continue;
      }

      const regex = getRegex(trigger.pattern, trigger.flags);
      if (!regex) continue;

      const match = text.match(regex);
      if (match) {
        lastFired.set(trigger.id, now);
        matches.push({ trigger, matchText: match[0] });
      }
    }

    return matches;
  },
}));

export { generateTriggerId };
export type { TriggerMatch };
