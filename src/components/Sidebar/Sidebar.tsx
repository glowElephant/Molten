import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Layers } from 'lucide-react';
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

  const [groupName, setGroupName] = useState('Split Group');
  const [groupCollapsed, setGroupCollapsed] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(groupName);
  const groupInputRef = useRef<HTMLInputElement>(null);

  const sessionList = Array.from(sessions.values());
  const splitSessionIds = new Set(layout ? collectSessionIds(layout) : []);
  const splitSessions = sessionList.filter((s) => splitSessionIds.has(s.id));
  const standaloneSessions = sessionList.filter((s) => !splitSessionIds.has(s.id));
  const activeInSplit = activeSessionId ? splitSessionIds.has(activeSessionId) : false;

  useEffect(() => {
    if (isEditingGroup && groupInputRef.current) {
      groupInputRef.current.focus();
      groupInputRef.current.select();
    }
  }, [isEditingGroup]);

  const handleNewSession = () => createSession();
  const handleToggle = () => updateNestedSetting('sidebar', 'visible', !visible);

  const handleGroupRename = () => {
    const trimmed = editGroupName.trim();
    if (trimmed) setGroupName(trimmed);
    setIsEditingGroup(false);
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

  let globalIndex = 0;

  return (
    <div
      className={`sidebar sidebar--${position}`}
      style={{ width: position === 'bottom' ? '100%' : width }}
    >
      <div className="sidebar__header">
        <span className="sidebar__title">Sessions</span>
        <div className="sidebar__actions">
          <button className="sidebar__button" onClick={handleNewSession} title="New session (Ctrl+N)">
            <Plus size={14} />
          </button>
          <button className="sidebar__button" onClick={handleToggle}>
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
            {splitSessions.length > 0 && (
              <div className={`sidebar__group ${activeInSplit ? 'sidebar__group--active' : ''}`}>
                <div
                  className="sidebar__group-header"
                  onClick={() => {
                    if (splitSessions.length > 0) setActiveSession(splitSessions[0].id);
                  }}
                >
                  <button
                    className="sidebar__group-chevron"
                    onClick={(e) => { e.stopPropagation(); setGroupCollapsed(!groupCollapsed); }}
                  >
                    {groupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <Layers size={12} />
                  {isEditingGroup ? (
                    <input
                      ref={groupInputRef}
                      className="sidebar__group-name-input"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      onBlur={handleGroupRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGroupRename();
                        if (e.key === 'Escape') setIsEditingGroup(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="sidebar__group-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditGroupName(groupName);
                        setIsEditingGroup(true);
                      }}
                    >
                      {groupName}
                    </span>
                  )}
                  <span className="sidebar__group-count">{splitSessions.length}</span>
                </div>

                {!groupCollapsed && splitSessions.map((session) => {
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
