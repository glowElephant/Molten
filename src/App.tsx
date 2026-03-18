import { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TerminalPanel } from './components/Terminal';
import { SplitView } from './components/SplitView';
import { NotificationPanel } from './components/Notification';
import { SettingsModal } from './components/Settings';
import { CommandPalette } from './components/CommandPalette';
import { KeybindingGuide } from './components/KeybindingGuide';
import { useSettingsStore } from './stores/settingsStore';
import { useSessionStore } from './stores/sessionStore';
import { useNotificationStore } from './stores/notificationStore';
import { useLayoutStore } from './stores/layoutStore';
import { useSessionNotifications } from './hooks/useSessionNotifications';
import { useSettingsPersistence } from './hooks/useSettingsPersistence';
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { initTriggerEngine } from './utils/triggerEngine';
import './utils/selfCapture';
import './App.css';

function App() {
  useSessionNotifications();
  useSettingsPersistence();
  useWorkspacePersistence();

  useEffect(() => { initTriggerEngine(); }, []);

  const { settings } = useSettingsStore();
  const { sidebar, titleBar } = settings;
  const { sessions, activeSessionId, createSession } = useSessionStore();
  const { togglePanel: toggleNotifications } = useNotificationStore();
  const { groups } = useLayoutStore();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat (holding key down)
      if (e.repeat) return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        createSession();
        // Layout preserved — new session appears on top as standalone
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault();
        const prevActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        if (prevActive) {
          useLayoutStore.getState().splitActive('horizontal', id, prevActive);
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const prevActive = useSessionStore.getState().activeSessionId;
        const id = useSessionStore.getState().createSession();
        if (prevActive) {
          useLayoutStore.getState().splitActive('vertical', id, prevActive);
        }
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
        if (state.activeSessionId) {
          useLayoutStore.getState().removeFromLayout(state.activeSessionId);
          state.closeSession(state.activeSessionId);
        }
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
      // Ctrl+? : Keybinding guide
      if (e.ctrlKey && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setGuideVisible((v) => !v);
      }
      if (e.key === 'Escape') {
        setPaletteVisible(false);
        setSettingsVisible(false);
        setGuideVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [createSession, toggleNotifications]);

  const sessionList = Array.from(sessions.values());
  const hasAnySessions = sessionList.length > 0;

  // Auto-clear groups when no sessions remain
  if (groups.length > 0 && !hasAnySessions) {
    setTimeout(() => useLayoutStore.getState().setLayout(null), 0);
  }

  // Collect all session IDs that are in any split group
  const splitSessionIds = useLayoutStore.getState().getAllSplitSessionIds();

  // Find which group contains the active session
  const activeGroup = activeSessionId
    ? groups.find((g) => {
        const ids = useLayoutStore.getState().findGroupBySession(activeSessionId);
        return ids?.id === g.id;
      })
    : undefined;

  // Sessions NOT in any split group (standalone)
  const standaloneSessions = sessionList.filter((s) => !splitSessionIds.has(s.id));

  return (
    <div className="app" data-theme={settings.theme} data-animations={settings.animations.enabled ? 'on' : 'off'}>
      {titleBar.position === 'top' && <TitleBar position="top" />}

      <div className="app__body">
        {titleBar.position === 'left' && <TitleBar position="left" />}
        {sidebar.position === 'left' && <Sidebar />}

        <main className="app__content">
          {/* Layer: Each split group (visible when active session is in that group) */}
          {groups.map((group) => {
            const isActiveGroup = activeGroup?.id === group.id;
            return (
              <div
                key={group.id}
                style={{ display: isActiveGroup ? 'flex' : 'none', flex: 1, minHeight: 0 }}
              >
                <SplitView node={group.layout} />
              </div>
            );
          })}

          {/* Layer: Standalone sessions (visible when active session is NOT in any group) */}
          {standaloneSessions.map((session) => (
            <div
              key={session.id}
              className="app__terminal-wrapper"
              style={{
                display: !activeGroup && session.id === activeSessionId ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
              }}
            >
              <TerminalPanel sessionId={session.id} />
            </div>
          ))}

          {/* Placeholder when no sessions */}
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
      <KeybindingGuide
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
      />

      {/* Gooey SVG filter for liquid merge/tear effects */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey" />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export default App;
