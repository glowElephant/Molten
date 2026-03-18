import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useSessionStore } from "./stores/sessionStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useLayoutStore } from "./stores/layoutStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import type { LayoutNode } from "./stores/layoutStore";
import { captureSelf } from "./utils/selfCapture";

// Dev-only: Register global command function that Rust API server calls via eval()
if (import.meta.env.DEV) {
  (window as any).__moltenExec = (action: string) => {
    console.log('[molten] __moltenExec called:', action);
    switch (action) {
      case 'session.create':
        useSessionStore.getState().createSession();
        break;
      case 'sidebar.toggle': {
        const s = useSettingsStore.getState();
        s.updateNestedSetting('sidebar', 'visible', !s.settings.sidebar.visible);
        break;
      }
      case 'sidebar.show':
        useSettingsStore.getState().updateNestedSetting('sidebar', 'visible', true);
        break;
      case 'sidebar.hide':
        useSettingsStore.getState().updateNestedSetting('sidebar', 'visible', false);
        break;
      case 'sidebar.left':
        useSettingsStore.getState().updateNestedSetting('sidebar', 'position', 'left');
        break;
      case 'sidebar.right':
        useSettingsStore.getState().updateNestedSetting('sidebar', 'position', 'right');
        break;
      case 'capture':
        captureSelf().catch(() => {});
        break;
      case 'session.close': {
        const state = useSessionStore.getState();
        if (state.activeSessionId) {
          useLayoutStore.getState().removeFromLayout(state.activeSessionId);
          state.closeSession(state.activeSessionId);
        }
        break;
      }
      case 'split.horizontal': {
        const prevActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        if (prevActive) {
          useLayoutStore.getState().splitActive('horizontal', id, prevActive);
        }
        break;
      }
      case 'split.vertical': {
        const prevActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        if (prevActive) {
          useLayoutStore.getState().splitActive('vertical', id, prevActive);
        }
        break;
      }
      case 'split.reset':
        useLayoutStore.getState().setLayout(null);
        break;
      case 'preset.dual':
      case 'preset.triple':
      case 'preset.stack':
      case 'preset.focus': {
        const presetName = action.replace('preset.', '');
        const capitalName = presetName.charAt(0).toUpperCase() + presetName.slice(1);
        const preset = useWorkspaceStore.getState().getPreset(capitalName);
        if (preset) {
          if (!preset.layout) {
            useLayoutStore.getState().setLayout(null);
            if (useSessionStore.getState().sessions.size === 0) {
              useSessionStore.getState().createSession();
            }
          } else {
            const sessionIds: string[] = [];
            for (let i = 0; i < preset.sessionCount; i++) {
              sessionIds.push(useSessionStore.getState().createSession());
            }
            const resolveLayout = (node: any): LayoutNode => {
              if (node.type === 'terminal') {
                const match = node.sessionId?.match(/__placeholder_(\d+)__/);
                if (match) {
                  const idx = parseInt(match[1]) - 1;
                  return { type: 'terminal', sessionId: sessionIds[idx] || sessionIds[0] };
                }
                return node;
              }
              if (node.type === 'split' && node.children) {
                return { ...node, children: node.children.map(resolveLayout) };
              }
              return node;
            };
            useLayoutStore.getState().setLayout(resolveLayout(preset.layout));
          }
        }
        break;
      }
      default:
        // Type text into active session's terminal
        if (action.startsWith('session.type.')) {
          const text = action.replace('session.type.', '');
          const activeId = useSessionStore.getState().activeSessionId;
          if (activeId) {
            import('@tauri-apps/api/core').then(({ invoke }) => {
              invoke('pty_write', { sessionId: activeId, data: text + '\n' }).catch(() => {});
            });
          }
        }
        if (action.startsWith('session.switch.')) {
          const idx = parseInt(action.replace('session.switch.', '')) - 1;
          const keys = Array.from(useSessionStore.getState().sessions.keys());
          if (idx >= 0 && idx < keys.length) {
            useSessionStore.getState().setActiveSession(keys[idx]);
          }
        }
        break;
    }
    setTimeout(() => captureSelf().catch(() => {}), 500);
  };
  console.log('[molten] __moltenExec registered');
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
