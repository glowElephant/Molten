import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { captureSelf } from './selfCapture';

function executeCommand(action: string) {
  console.log('[molten-cmd] Executing:', action);
  switch (action) {
    case 'session.create':
      useSessionStore.getState().createSession();
      break;
    case 'sidebar.toggle': {
      const store = useSettingsStore.getState();
      store.updateNestedSetting('sidebar', 'visible', !store.settings.sidebar.visible);
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
    default:
      console.warn('[molten-cmd] Unknown:', action);
  }
  setTimeout(() => captureSelf().catch(() => {}), 500);
}

/**
 * Dev-only: Listen for commands via DOM CustomEvent.
 * Rust API server calls eval() to dispatch 'molten-cmd' events on document.
 * This works because DOM events are in the same global scope as eval().
 */
export function initCommandListener() {
  if (!import.meta.env.DEV) return;

  document.addEventListener('molten-cmd', ((e: CustomEvent) => {
    executeCommand(e.detail);
  }) as EventListener);

  console.log('[molten-cmd] Listening on document for molten-cmd events');
}
