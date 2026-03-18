import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useSessionStore } from "./stores/sessionStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useLayoutStore } from "./stores/layoutStore";
import { captureSelf } from "./utils/selfCapture";

// Dev-only: Register global command function that Rust API server calls via eval()
if (import.meta.env.DEV) {
  (window as any).__moltenExec = (action: string) => {
    console.log('[molten] __moltenExec called:', action);
    switch (action) {
      case 'session.create':
        useSessionStore.getState().createSession();
        useLayoutStore.getState().setLayout(null); // Exit split mode
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
        const currentLayout = useLayoutStore.getState().layout;
        if (!currentLayout && prevActive) {
          useLayoutStore.getState().setLayout({
            type: 'split', direction: 'horizontal',
            children: [
              { type: 'terminal', sessionId: prevActive },
              { type: 'terminal', sessionId: id },
            ],
          });
        } else if (currentLayout && prevActive) {
          useLayoutStore.getState().splitActive('horizontal', id, prevActive);
        }
        break;
      }
      case 'split.vertical': {
        const prevActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        const currentLayout = useLayoutStore.getState().layout;
        if (!currentLayout && prevActive) {
          useLayoutStore.getState().setLayout({
            type: 'split', direction: 'vertical',
            children: [
              { type: 'terminal', sessionId: prevActive },
              { type: 'terminal', sessionId: id },
            ],
          });
        } else if (currentLayout && prevActive) {
          useLayoutStore.getState().splitActive('vertical', id, prevActive);
        }
        break;
      }
      case 'split.reset':
        useLayoutStore.getState().setLayout(null);
        break;
      default:
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
