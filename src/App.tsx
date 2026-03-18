import { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TerminalPanel } from './components/Terminal';
import { SplitView } from './components/SplitView';
import { NotificationPanel } from './components/Notification';
import { SettingsModal } from './components/Settings';
import { CommandPalette } from './components/CommandPalette';
import { useSettingsStore } from './stores/settingsStore';
import { useSessionStore } from './stores/sessionStore';
import { useNotificationStore } from './stores/notificationStore';
import { useLayoutStore } from './stores/layoutStore';
import { useSessionNotifications } from './hooks/useSessionNotifications';
import './App.css';

function App() {
  useSessionNotifications();

  const { settings } = useSettingsStore();
  const { sidebar, titleBar } = settings;
  const { sessions, activeSessionId, createSession } = useSessionStore();
  const { togglePanel: toggleNotifications } = useNotificationStore();
  const { layout, setLayout } = useLayoutStore();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);

  // When active session changes and we're NOT in split mode, clear the split layout
  const isSplitMode = layout !== null && layout.type === 'split';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New session (single view, no split)
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        createSession();
        // Exit split mode — new session takes full screen
        setLayout(null);
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
      // Ctrl+W: Close active session
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const state = useSessionStore.getState();
        if (state.activeSessionId) {
          useLayoutStore.getState().removeFromLayout(state.activeSessionId);
          state.closeSession(state.activeSessionId);
        }
      }
      // Ctrl+D: Split vertical (new session to the right)
      if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault();
        const currentActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        // If not in split mode, create initial split from active + new
        const currentLayout = useLayoutStore.getState().layout;
        if (!currentLayout && currentActive) {
          useLayoutStore.getState().setLayout({
            type: 'split',
            direction: 'horizontal',
            children: [
              { type: 'terminal', sessionId: currentActive },
              { type: 'terminal', sessionId: id },
            ],
          });
        } else {
          useLayoutStore.getState().splitActive('horizontal', id);
        }
      }
      // Ctrl+Shift+D: Split horizontal (new session below)
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const currentActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        const currentLayout = useLayoutStore.getState().layout;
        if (!currentLayout && currentActive) {
          useLayoutStore.getState().setLayout({
            type: 'split',
            direction: 'vertical',
            children: [
              { type: 'terminal', sessionId: currentActive },
              { type: 'terminal', sessionId: id },
            ],
          });
        } else {
          useLayoutStore.getState().splitActive('vertical', id);
        }
      }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const keys = Array.from(useSessionStore.getState().sessions.keys());
        if (idx < keys.length) {
          useSessionStore.getState().setActiveSession(keys[idx]);
        }
      }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const state = useSessionStore.getState();
        const keys = Array.from(state.sessions.keys());
        if (keys.length > 1 && state.activeSessionId) {
          const idx = keys.indexOf(state.activeSessionId);
          const nextIdx = (idx + 1) % keys.length;
          state.setActiveSession(keys[nextIdx]);
        }
      }
      if (e.key === 'Escape') {
        setPaletteVisible(false);
        setSettingsVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [createSession, toggleNotifications, setLayout]);

  const sessionList = Array.from(sessions.values());
  const hasAnySessions = sessionList.length > 0;

  return (
    <div className="app" data-theme={settings.theme}>
      {titleBar.position === 'top' && <TitleBar position="top" />}

      <div className="app__body">
        {titleBar.position === 'left' && <TitleBar position="left" />}
        {sidebar.position === 'left' && <Sidebar />}

        <main className="app__content">
          {isSplitMode && layout ? (
            // Split mode: show all split panes
            <SplitView node={layout} />
          ) : hasAnySessions ? (
            // Single mode: show active session only
            sessionList.map((session) => (
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
            ))
          ) : (
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
