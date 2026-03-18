import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLayoutStore, collectSessionIds } from '../../stores/layoutStore';
import type { LayoutGroup } from '../../stores/layoutStore';
import type { Session } from '../../types';
import { SessionItem } from './SessionItem';
import { useDragReorder } from './useDragReorder';
import './Sidebar.css';

export function Sidebar() {
  const { settings, updateNestedSetting } = useSettingsStore();
  const { sessions, sessionOrder, activeSessionId, createSession, setActiveSession, reorderSessions } = useSessionStore();
  const { groups, renameGroup, toggleGroupCollapse, reorderGroups } = useLayoutStore();
  const { visible, position, width } = settings.sidebar;

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const groupInputRef = useRef<HTMLInputElement>(null);

  const allSplitIds = useLayoutStore.getState().getAllSplitSessionIds();
  const standaloneOrder = sessionOrder.filter((id) => !allSplitIds.has(id) && sessions.has(id));

  useEffect(() => {
    if (editingGroupId && groupInputRef.current) {
      groupInputRef.current.focus();
      groupInputRef.current.select();
    }
  }, [editingGroupId]);

  const handleNewSession = () => createSession();
  const handleToggle = () => updateNestedSetting('sidebar', 'visible', !visible);

  const handleGroupRename = (groupId: string) => {
    const trimmed = editGroupName.trim();
    if (trimmed) renameGroup(groupId, trimmed);
    setEditingGroupId(null);
  };

  const handleStandaloneReorder = (fromVisualIdx: number, toVisualIdx: number) => {
    const fromId = standaloneOrder[fromVisualIdx];
    const toId = standaloneOrder[toVisualIdx];
    if (!fromId || !toId) return;
    const fromOrderIdx = sessionOrder.indexOf(fromId);
    const toOrderIdx = sessionOrder.indexOf(toId);
    if (fromOrderIdx !== -1 && toOrderIdx !== -1) {
      reorderSessions(fromOrderIdx, toOrderIdx);
    }
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

  // Pre-compute global indices: groups first, then standalone
  type IndexedItem =
    | { kind: 'group'; group: LayoutGroup; groupIdx: number; sessions: Session[]; startIndex: number }
    | { kind: 'standalone'; session: Session; globalIndex: number; visualIndex: number };

  const items: IndexedItem[] = [];
  let globalIndex = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const groupSessionIds = collectSessionIds(group.layout);
    const groupSessions = groupSessionIds
      .map((id) => sessions.get(id))
      .filter((s): s is Session => !!s);
    if (groupSessions.length === 0) continue;
    items.push({ kind: 'group', group, groupIdx: gi, sessions: groupSessions, startIndex: globalIndex });
    globalIndex += groupSessions.length;
  }

  for (let vi = 0; vi < standaloneOrder.length; vi++) {
    const session = sessions.get(standaloneOrder[vi]);
    if (!session) continue;
    globalIndex++;
    items.push({ kind: 'standalone', session, globalIndex, visualIndex: vi });
  }

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
        {sessions.size === 0 ? (
          <div className="sidebar__empty">
            <p>No sessions yet</p>
            <button className="sidebar__empty-button" onClick={handleNewSession}>
              Create session
            </button>
          </div>
        ) : (
          <>
            {items.map((item) => {
              if (item.kind === 'group') {
                const activeInGroup = activeSessionId
                  ? collectSessionIds(item.group.layout).includes(activeSessionId)
                  : false;
                return (
                  <DraggableGroup
                    key={item.group.id}
                    groupIdx={item.groupIdx}
                    group={item.group}
                    groupSessions={item.sessions}
                    startIndex={item.startIndex}
                    activeInGroup={activeInGroup}
                    activeSessionId={activeSessionId}
                    editingGroupId={editingGroupId}
                    editGroupName={editGroupName}
                    groupInputRef={groupInputRef}
                    onSetActiveSession={setActiveSession}
                    onToggleCollapse={toggleGroupCollapse}
                    onSetEditingGroupId={setEditingGroupId}
                    onSetEditGroupName={setEditGroupName}
                    onGroupRename={handleGroupRename}
                    onReorderGroups={reorderGroups}
                  />
                );
              } else {
                return (
                  <DraggableSessionItem
                    key={item.session.id}
                    session={item.session}
                    index={item.globalIndex}
                    visualIndex={item.visualIndex}
                    isActive={item.session.id === activeSessionId}
                    onClick={() => setActiveSession(item.session.id)}
                    onReorder={handleStandaloneReorder}
                  />
                );
              }
            })}
          </>
        )}
      </div>
    </div>
  );
}

function DraggableGroup({
  groupIdx, group, groupSessions, startIndex, activeInGroup, activeSessionId,
  editingGroupId, editGroupName, groupInputRef,
  onSetActiveSession, onToggleCollapse, onSetEditingGroupId, onSetEditGroupName,
  onGroupRename, onReorderGroups,
}: {
  groupIdx: number;
  group: LayoutGroup;
  groupSessions: Session[];
  startIndex: number;
  activeInGroup: boolean;
  activeSessionId: string | null;
  editingGroupId: string | null;
  editGroupName: string;
  groupInputRef: React.RefObject<HTMLInputElement | null>;
  onSetActiveSession: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onSetEditingGroupId: (id: string | null) => void;
  onSetEditGroupName: (name: string) => void;
  onGroupRename: (id: string) => void;
  onReorderGroups: (from: number, to: number) => void;
}) {
  const { ref, isDragging, dropPosition, dragProps } = useDragReorder({
    type: 'sidebar-group',
    index: groupIdx,
    onReorder: onReorderGroups,
  });

  const dropClass = dropPosition === 'above' ? 'sidebar__group--drop-above'
    : dropPosition === 'below' ? 'sidebar__group--drop-below' : '';

  return (
    <div
      ref={ref}
      className={`sidebar__group ${activeInGroup ? 'sidebar__group--active' : ''} ${isDragging ? 'sidebar__group--dragging' : ''} ${dropClass}`}
      {...dragProps}
    >
      <div
        className="sidebar__group-header"
        onClick={() => {
          if (groupSessions.length > 0) onSetActiveSession(groupSessions[0].id);
        }}
      >
        <button
          className="sidebar__group-chevron"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleCollapse(group.id); }}
        >
          {group.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
        <Layers size={12} />
        {editingGroupId === group.id ? (
          <input
            ref={groupInputRef}
            className="sidebar__group-name-input"
            value={editGroupName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSetEditGroupName(e.target.value)}
            onBlur={() => onGroupRename(group.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') onGroupRename(group.id);
              if (e.key === 'Escape') onSetEditingGroupId(null);
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ) : (
          <span
            className="sidebar__group-name"
            onDoubleClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSetEditGroupName(group.name);
              onSetEditingGroupId(group.id);
            }}
          >
            {group.name}
          </span>
        )}
        <span className="sidebar__group-count">{groupSessions.length}</span>
      </div>

      {!group.collapsed && groupSessions.map((session, i) => (
        <SessionItem
          key={session.id}
          session={session}
          index={startIndex + i + 1}
          isActive={session.id === activeSessionId}
          onClick={() => onSetActiveSession(session.id)}
        />
      ))}
    </div>
  );
}

function DraggableSessionItem({
  session, index, visualIndex, isActive, onClick, onReorder,
}: {
  session: Session;
  index: number;
  visualIndex: number;
  isActive: boolean;
  onClick: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const { ref, isDragging, dropPosition, dragProps } = useDragReorder({
    type: 'sidebar-session',
    index: visualIndex,
    onReorder,
  });

  const dropClass = dropPosition === 'above' ? 'session-item--drop-above'
    : dropPosition === 'below' ? 'session-item--drop-below' : '';

  return (
    <div ref={ref} {...dragProps} className={`${isDragging ? 'session-item--dragging' : ''} ${dropClass}`}>
      <SessionItem
        session={session}
        index={index}
        isActive={isActive}
        onClick={onClick}
      />
    </div>
  );
}
