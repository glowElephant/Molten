import { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TerminalPanel } from './components/Terminal';
import { NotificationPanel } from './components/Notification';
import { SettingsModal } from './components/Settings';
import { CommandPalette } from './components/CommandPalette';
import { useSettingsStore } from './stores/settingsStore';
import { useSessionStore } from './stores/sessionStore';
import { useNotificationStore } from './stores/notificationStore';
import { useSessionNotifications } from './hooks/useSessionNotifications';
import './App.css';

function App() {
  useSessionNotifications();

  const { settings } = useSettingsStore();
  const { sidebar, titleBar } = settings;
  const { sessions, activeSessionId, createSession } = useSessionStore();
  const { togglePanel: toggleNotifications } = useNotificationStore();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        createSession();
      }
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        useSettingsStore.getState().updateNestedSetting(
          'sidebar', 'visible', !useSettingsStore.getState().settings.sidebar.visible
        );
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        toggleNotifications();
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setSettingsVisible((v) => !v);
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setPaletteVisible((v) => !v);
      }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const state = useSessionStore.getState();
        if (state.activeSessionId) state.closeSession(state.activeSessionId);
      }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const keys = Array.from(useSessionStore.getState().sessions.keys());
        if (idx < keys.length) useSessionStore.getState().setActiveSession(keys[idx]);
      }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const state = useSessionStore.getState();
        const keys = Array.from(state.sessions.keys());
        if (keys.length > 1 && state.activeSessionId) {
          const idx = keys.indexOf(state.activeSessionId);
          state.setActiveSession(keys[(idx + 1) % keys.length]);
        }
      }
      if (e.key === 'Escape') {
        setPaletteVisible(false);
        setSettingsVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [createSession, toggleNotifications]);

  const sessionList = Array.from(sessions.values());
  const hasAnySessions = sessionList.length > 0;

  return (
    <div className="app" data-theme={settings.theme}>
      {titleBar.position === 'top' && <TitleBar position="top" />}

      <div className="app__body">
        {titleBar.position === 'left' && <TitleBar position="left" />}
        {sidebar.position === 'left' && <Sidebar />}

        <main className="app__content">
          {sessionList.map((session) => (
            <div
              key={session.id}
              className="app__terminal-wrapper"
              style={{
                display: session.id === activeSessionId ? 'flex' : 'none',
                flex: 1,
                minHeight: 0,
              }}
            >
              <TerminalPanel sessionId={session.id} />
            </div>
          ))}

          {!hasAnySessions && (
            <div className="app__placeholder">
              <div className="app__placeholder-logo">◆</div>
              <h1 className="app__placeholder-title">Molten</h1>
              <p className="app__placeholder-subtitle">
                The liquid terminal for AI coding agents
              </p>
              <p className="app__placeholder-hint">
                Press <kbd>Ctrl+N</kbd> to create a new session
              </p>
            </div>
          )}

          <NotificationPanel />
        </main>

        {sidebar.position === 'right' && <Sidebar />}
        {titleBar.position === 'right' && <TitleBar position="right" />}
      </div>

      {sidebar.position === 'bottom' && <Sidebar />}
      {titleBar.position === 'bottom' && <TitleBar position="bottom" />}
      <StatusBar />

      <CommandPalette
        visible={paletteVisible}
        onClose={() => setPaletteVisible(false)}
        onOpenSettings={() => setSettingsVisible(true)}
      />
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </div>
  );
}

export default App;
