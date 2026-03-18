import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useSessionStore } from "./stores/sessionStore";
import { useSettingsStore } from "./stores/settingsStore";
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
      case 'capture':
        captureSelf().catch(() => {});
        break;
    }
    // Auto-capture after command
    setTimeout(() => captureSelf().catch(() => {}), 500);
  };
  console.log('[molten] __moltenExec registered');
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
