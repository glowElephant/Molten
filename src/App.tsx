import { useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TerminalPanel } from './components/Terminal';
import { useSettingsStore } from './stores/settingsStore';
import { useSessionStore } from './stores/sessionStore';
import './App.css';

function App() {
  const { settings } = useSettingsStore();
  const { sidebar, titleBar } = settings;
  const { sessions, activeSessionId, createSession } = useSessionStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New session
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createSession();
      }

      // Ctrl+B: Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        useSettingsStore.getState().updateNestedSetting(
          'sidebar',
          'visible',
          !useSettingsStore.getState().settings.sidebar.visible
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createSession]);

  const hasActiveSession = activeSessionId && sessions.has(activeSessionId);

  return (
    <div className="app" data-theme={settings.theme}>
      {titleBar.position === 'top' && <TitleBar position="top" />}

      <div className="app__body">
        {titleBar.position === 'left' && <TitleBar position="left" />}

        {sidebar.position === 'left' && <Sidebar />}

        <main className="app__content">
          {hasActiveSession ? (
            <TerminalPanel sessionId={activeSessionId} />
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
        </main>

        {sidebar.position === 'right' && <Sidebar />}
        {titleBar.position === 'right' && <TitleBar position="right" />}
      </div>

      {sidebar.position === 'bottom' && <Sidebar />}
      {titleBar.position === 'bottom' && <TitleBar position="bottom" />}

      <StatusBar />
    </div>
  );
}

export default App;
