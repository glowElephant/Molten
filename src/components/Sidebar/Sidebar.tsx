import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { SessionItem } from './SessionItem';
import './Sidebar.css';

export function Sidebar() {
  const { settings, updateNestedSetting } = useSettingsStore();
  const { sessions, activeSessionId, createSession, setActiveSession } = useSessionStore();
  const { visible, position, width } = settings.sidebar;

  const sessionList = Array.from(sessions.values());

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
          sessionList.map((session, index) => (
            <SessionItem
              key={session.id}
              session={session}
              index={index + 1}
              isActive={session.id === activeSessionId}
              onClick={() => setActiveSession(session.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
