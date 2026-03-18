import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Persist settings to disk when they change, and load on startup.
 */
export function useSettingsPersistence() {
  const { settings, loadSettings } = useSettingsStore();
  const initialized = useRef(false);

  // Load settings on startup
  useEffect(() => {
    invoke<string>('load_config')
      .then((json) => {
        try {
          const config = JSON.parse(json);
          // Map config fields to settings store
          const settingsUpdate: Record<string, unknown> = {};
          if (config.sidebar) {
            settingsUpdate.sidebar = {
              visible: config.sidebar.visible ?? true,
              position: config.sidebar.position ?? 'left',
              width: config.sidebar.width ?? 260,
            };
          }
          if (config.font) {
            settingsUpdate.font = {
              family: config.font.family ?? 'JetBrains Mono, Cascadia Code, Menlo, Consolas, monospace',
              size: config.font.size ?? 14,
              lineHeight: 1.4,
            };
          }
          if (config.terminal) {
            settingsUpdate.terminal = {
              scrollback: config.terminal.scrollback ?? 10000,
              cursorBlink: config.terminal.cursor_blink ?? true,
              cursorStyle: 'bar' as const,
              defaultShell: '',
              defaultCwd: '',
            };
          }
          loadSettings(settingsUpdate);
          initialized.current = true;
        } catch {
          initialized.current = true;
        }
      })
      .catch(() => {
        initialized.current = true;
      });
  }, [loadSettings]);

  // Save settings when they change (debounced)
  useEffect(() => {
    if (!initialized.current) return;

    const timer = setTimeout(() => {
      const config = {
        sidebar: {
          visible: settings.sidebar.visible,
          position: settings.sidebar.position,
          width: settings.sidebar.width,
        },
        font: {
          family: settings.font.family,
          size: settings.font.size,
        },
        terminal: {
          scrollback: settings.terminal.scrollback,
          cursor_blink: settings.terminal.cursorBlink,
        },
      };
      invoke('save_config', { config: JSON.stringify(config, null, 2) }).catch(() => {});
    }, 1000);

    return () => clearTimeout(timer);
  }, [settings]);
}
