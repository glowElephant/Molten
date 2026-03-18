import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSessionStore } from '../stores/sessionStore';
import { useLayoutStore } from '../stores/layoutStore';
import { useTriggerStore } from '../stores/triggerStore';
import { useQuickCommandStore } from '../stores/quickCommandStore';
import { takeSnapshot, restoreSnapshot } from '../utils/workspacePersistence';

/**
 * Persist workspace (sessions + layout) to disk.
 * Restores on startup, auto-saves on change, saves on window close.
 */
export function useWorkspacePersistence() {
  const initialized = useRef(false);
  const sessions = useSessionStore((s) => s.sessions);
  const sessionOrder = useSessionStore((s) => s.sessionOrder);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const groups = useLayoutStore((s) => s.groups);
  const triggers = useTriggerStore((s) => s.triggers);
  const quickCommands = useQuickCommandStore((s) => s.commands);

  // Load workspace on startup
  useEffect(() => {
    invoke<string>('load_workspace')
      .then((json) => {
        try {
          const snapshot = JSON.parse(json);
          if (snapshot.version && snapshot.sessions?.length > 0) {
            restoreSnapshot(snapshot);
          }
        } catch {
          // Corrupted JSON — start clean
        }
        initialized.current = true;
      })
      .catch(() => {
        initialized.current = true;
      });
  }, []);

  // Auto-save on state change (debounced 2s)
  useEffect(() => {
    if (!initialized.current) return;

    const timer = setTimeout(() => {
      const snapshot = takeSnapshot();
      invoke('save_workspace', {
        data: JSON.stringify(snapshot, null, 2),
      }).catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessions, sessionOrder, activeSessionId, groups, triggers, quickCommands]);

  // Save on window close (guaranteed via Tauri's onCloseRequested)
  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async () => {
      const snapshot = takeSnapshot();
      await invoke('save_workspace', {
        data: JSON.stringify(snapshot, null, 2),
      }).catch(() => {});
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);
}
