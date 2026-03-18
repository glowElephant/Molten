import { create } from 'zustand';
import type { MoltenSettings } from '../types';

const defaultSettings: MoltenSettings = {
  theme: 'obsidian',
  font: {
    family: 'JetBrains Mono, Cascadia Code, Menlo, Consolas, monospace',
    size: 14,
    lineHeight: 1.4,
  },
  terminal: {
    scrollback: 10000,
    cursorBlink: true,
    cursorStyle: 'bar',
    defaultShell: '',
    defaultCwd: '',
  },
  notifications: {
    enabled: true,
    desktop: true,
    sound: false,
    onWaiting: true,
    onCompleted: true,
    onError: true,
  },
  animations: {
    enabled: true,
    gooeyEffect: true,
    springPhysics: true,
    speed: 1,
  },
  sidebar: {
    visible: true,
    position: 'left',
    width: 260,
  },
  titleBar: {
    position: 'top',
  },
};

interface SettingsStore {
  settings: MoltenSettings;

  // Actions
  updateSetting: <K extends keyof MoltenSettings>(
    key: K,
    value: MoltenSettings[K]
  ) => void;
  updateNestedSetting: <
    K extends keyof MoltenSettings,
    NK extends keyof MoltenSettings[K],
  >(
    key: K,
    nestedKey: NK,
    value: MoltenSettings[K][NK]
  ) => void;
  resetSettings: () => void;
  loadSettings: (settings: Partial<MoltenSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: { ...defaultSettings },

  updateSetting: (key, value) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  updateNestedSetting: (key, nestedKey, value) => {
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: {
          ...(state.settings[key] as Record<string, unknown>),
          [nestedKey]: value,
        },
      },
    }));
  },

  resetSettings: () => {
    set({ settings: { ...defaultSettings } });
  },

  loadSettings: (settings) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));
  },
}));

export { defaultSettings };
