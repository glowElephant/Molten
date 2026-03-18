import { create } from 'zustand';

export interface WorkspacePreset {
  name: string;
  description: string;
  /** Serialized layout tree */
  layout: unknown;
  /** Number of sessions in this preset */
  sessionCount: number;
  createdAt: string;
}

interface WorkspaceStore {
  presets: WorkspacePreset[];

  addPreset: (preset: WorkspacePreset) => void;
  removePreset: (name: string) => void;
  getPreset: (name: string) => WorkspacePreset | undefined;
  loadPresets: (presets: WorkspacePreset[]) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  presets: [
    // Built-in presets
    {
      name: 'Focus',
      description: 'Single terminal, full screen',
      layout: null,
      sessionCount: 1,
      createdAt: '',
    },
    {
      name: 'Dual',
      description: 'Two terminals side by side',
      layout: {
        type: 'split',
        direction: 'horizontal',
        children: [
          { type: 'terminal', sessionId: '__placeholder_1__' },
          { type: 'terminal', sessionId: '__placeholder_2__' },
        ],
      },
      sessionCount: 2,
      createdAt: '',
    },
    {
      name: 'Triple',
      description: 'Three terminals side by side',
      layout: {
        type: 'split',
        direction: 'horizontal',
        children: [
          { type: 'terminal', sessionId: '__placeholder_1__' },
          { type: 'terminal', sessionId: '__placeholder_2__' },
          { type: 'terminal', sessionId: '__placeholder_3__' },
        ],
      },
      sessionCount: 3,
      createdAt: '',
    },
    {
      name: 'Stack',
      description: 'Two terminals stacked vertically',
      layout: {
        type: 'split',
        direction: 'vertical',
        children: [
          { type: 'terminal', sessionId: '__placeholder_1__' },
          { type: 'terminal', sessionId: '__placeholder_2__' },
        ],
      },
      sessionCount: 2,
      createdAt: '',
    },
  ],

  addPreset: (preset) => {
    set((state) => ({
      presets: [...state.presets.filter((p) => p.name !== preset.name), preset],
    }));
  },

  removePreset: (name) => {
    set((state) => ({
      presets: state.presets.filter((p) => p.name !== name),
    }));
  },

  getPreset: (name) => {
    return get().presets.find((p) => p.name === name);
  },

  loadPresets: (presets) => {
    set({ presets });
  },
}));
