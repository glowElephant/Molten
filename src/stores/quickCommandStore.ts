import { create } from 'zustand';

export interface QuickCommand {
  id: string;
  name: string;
  command: string;
}

interface QuickCommandStore {
  commands: QuickCommand[];
  addCommand: (name: string, command: string) => string;
  removeCommand: (id: string) => void;
  updateCommand: (id: string, partial: Partial<QuickCommand>) => void;
  setCommands: (commands: QuickCommand[]) => void;
}

function generateId(): string {
  return `qcmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useQuickCommandStore = create<QuickCommandStore>((set) => ({
  commands: [
    {
      id: 'default-cc-bypass',
      name: 'Claude Code (bypass)',
      command: 'claude --dangerously-skip-permissions',
    },
    {
      id: 'default-cc-normal',
      name: 'Claude Code',
      command: 'claude',
    },
  ],

  addCommand: (name: string, command: string) => {
    const id = generateId();
    set((state) => ({
      commands: [...state.commands, { id, name, command }],
    }));
    return id;
  },

  removeCommand: (id: string) => {
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    }));
  },

  updateCommand: (id: string, partial: Partial<QuickCommand>) => {
    set((state) => ({
      commands: state.commands.map((c) =>
        c.id === id ? { ...c, ...partial } : c
      ),
    }));
  },

  setCommands: (commands: QuickCommand[]) => {
    set({ commands });
  },
}));
