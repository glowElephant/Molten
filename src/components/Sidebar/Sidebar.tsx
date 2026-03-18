import { Plus, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { collectSessionIds } from '../SplitView';
import { SessionItem } from './SessionItem';
import './Sidebar.css';

export function Sidebar() {
  const { settings, updateNestedSetting } = useSettingsStore();
  const { sessions, activeSessionId, createSession, setActiveSession } = useSessionStore();
  const { layout } = useLayoutStore();
  const { visible, position, width } = settings.sidebar;

  const sessionList = Array.from(sessions.values());

  // Determine which sessions are in the split group
  const splitSessionIds = new Set(layout ? collectSessionIds(layout) : []);
  const splitSessions = sessionList.filter((s) => splitSessionIds.has(s.id));
  const standaloneSessions = sessionList.filter((s) => !splitSessionIds.has(s.id));

  // Is the active session in the split group?
  const activeInSplit = activeSessionId ? splitSessionIds.has(activeSessionId) : false;

  const handleNewSession = () => {
    createSession();
  };

  const handleToggle = () => {
    updateNestedSetting('sidebar', 'visible', !visible);
  };

  if (!visible) {
    return (
      <button
        className={`sidebar-toggle sidebar-toggle--${position}`}
        onClick={handleToggle}
        aria-label="Show sidebar"
      >
        <ChevronRight size={14} />
      </button>
    );
  }

  // Global index counter for Ctrl+1~9
  let globalIndex = 0;

  return (
    <div
      className={`sidebar sidebar--${position}`}
      style={{ width: position === 'bottom' ? '100%' : width }}
    >
      <div className="sidebar__header">
        <span className="sidebar__title">Sessions</span>
        <div className="sidebar__actions">
          <button
            className="sidebar__button"
            onClick={handleNewSession}
            aria-label="New session"
            title="New session (Ctrl+N)"
          >
            <Plus size={14} />
          </button>
          <button
            className="sidebar__button"
            onClick={handleToggle}
            aria-label="Hide sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      <div className="sidebar__sessions">
        {sessionList.length === 0 ? (
          <div className="sidebar__empty">
            <p>No sessions yet</p>
            <button className="sidebar__empty-button" onClick={handleNewSession}>
              Create session
            </button>
          </div>
        ) : (
          <>
            {/* Split group */}
            {splitSessions.length > 0 && (
              <div className={`sidebar__group ${activeInSplit ? 'sidebar__group--active' : ''}`}>
                <div
                  className="sidebar__group-header"
                  onClick={() => {
                    if (splitSessions.length > 0) {
                      setActiveSession(splitSessions[0].id);
                    }
                  }}
                >
                  <Layers size={12} />
                  <span>Split Group</span>
                  <span className="sidebar__group-count">{splitSessions.length}</span>
                </div>
                {splitSessions.map((session) => {
                  globalIndex++;
                  return (
                    <SessionItem
                      key={session.id}
                      session={session}
                      index={globalIndex}
                      isActive={session.id === activeSessionId}
                      onClick={() => setActiveSession(session.id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Standalone sessions */}
            {standaloneSessions.map((session) => {
              globalIndex++;
              return (
                <SessionItem
                  key={session.id}
                  session={session}
                  index={globalIndex}
                  isActive={session.id === activeSessionId}
                  onClick={() => setActiveSession(session.id)}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
