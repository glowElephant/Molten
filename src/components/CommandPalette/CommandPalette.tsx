import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Settings, Bell, Sidebar,
  X as XIcon, Layout,
  Terminal, Search
} from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useLayoutStore } from '../../stores/layoutStore';
import './CommandPalette.css';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({ visible, onClose, onOpenSettings }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { sessions, createSession, setActiveSession, closeSession } = useSessionStore();
  const { settings } = useSettingsStore();
  const { togglePanel: toggleNotifications } = useNotificationStore();

  // Build command list
  const commands = useMemo((): Command[] => {
    const cmds: Command[] = [
      // Session commands
      {
        id: 'new-session',
        label: 'New Session',
        shortcut: 'Ctrl+N',
        icon: <Plus size={14} />,
        action: () => { createSession(); onClose(); },
        category: 'Sessions',
      },
      // Switch to specific sessions
      ...Array.from(sessions.values()).map((session, i) => ({
        id: `switch-${session.id}`,
        label: `Switch to: ${session.name}`,
        shortcut: i < 9 ? `Ctrl+${i + 1}` : undefined,
        icon: <Terminal size={14} />,
        action: () => { setActiveSession(session.id); onClose(); },
        category: 'Sessions',
      })),
      // Close sessions
      ...Array.from(sessions.values()).map((session) => ({
        id: `close-${session.id}`,
        label: `Close: ${session.name}`,
        icon: <XIcon size={14} />,
        action: () => { closeSession(session.id); onClose(); },
        category: 'Sessions',
      })),
      // UI commands
      {
        id: 'toggle-sidebar',
        label: settings.sidebar.visible ? 'Hide Sidebar' : 'Show Sidebar',
        shortcut: 'Ctrl+B',
        icon: <Sidebar size={14} />,
        action: () => {
          useSettingsStore.getState().updateNestedSetting(
            'sidebar', 'visible', !settings.sidebar.visible
          );
          onClose();
        },
        category: 'View',
      },
      {
        id: 'toggle-notifications',
        label: 'Toggle Notifications',
        shortcut: 'Ctrl+Shift+N',
        icon: <Bell size={14} />,
        action: () => { toggleNotifications(); onClose(); },
        category: 'View',
      },
      {
        id: 'open-settings',
        label: 'Open Settings',
        shortcut: 'Ctrl+,',
        icon: <Settings size={14} />,
        action: () => { onOpenSettings(); onClose(); },
        category: 'Settings',
      },
      // Layout presets
      {
        id: 'sidebar-left',
        label: 'Sidebar: Left',
        icon: <Layout size={14} />,
        action: () => {
          useSettingsStore.getState().updateNestedSetting('sidebar', 'position', 'left');
          onClose();
        },
        category: 'Layout',
      },
      {
        id: 'sidebar-right',
        label: 'Sidebar: Right',
        icon: <Layout size={14} />,
        action: () => {
          useSettingsStore.getState().updateNestedSetting('sidebar', 'position', 'right');
          onClose();
        },
        category: 'Layout',
      },
      // Split commands
      {
        id: 'split-horizontal',
        label: 'Split: Left / Right',
        shortcut: 'Ctrl+D',
        icon: <Layout size={14} />,
        action: () => {
          const prevActive = useSessionStore.getState().activeSessionId;
          const id = useSessionStore.getState().createSession();
          const currentLayout = useLayoutStore.getState().layout;
          if (!currentLayout && prevActive) {
            useLayoutStore.getState().setLayout({
              type: 'split', direction: 'horizontal',
              children: [
                { type: 'terminal', sessionId: prevActive },
                { type: 'terminal', sessionId: id },
              ],
            });
          } else if (currentLayout && prevActive) {
            useLayoutStore.getState().splitActive('horizontal', id, prevActive);
          }
          onClose();
        },
        category: 'Split',
      },
      {
        id: 'split-vertical',
        label: 'Split: Top / Bottom',
        shortcut: 'Ctrl+Shift+D',
        icon: <Layout size={14} />,
        action: () => {
          const prevActive = useSessionStore.getState().activeSessionId;
          const id = useSessionStore.getState().createSession();
          const currentLayout = useLayoutStore.getState().layout;
          if (!currentLayout && prevActive) {
            useLayoutStore.getState().setLayout({
              type: 'split', direction: 'vertical',
              children: [
                { type: 'terminal', sessionId: prevActive },
                { type: 'terminal', sessionId: id },
              ],
            });
          } else if (currentLayout && prevActive) {
            useLayoutStore.getState().splitActive('vertical', id, prevActive);
          }
          onClose();
        },
        category: 'Split',
      },
      {
        id: 'split-reset',
        label: 'Exit Split Mode',
        icon: <Terminal size={14} />,
        action: () => {
          useLayoutStore.getState().setLayout(null);
          onClose();
        },
        category: 'Split',
      },
    ];
    return cmds;
  }, [sessions, settings, createSession, setActiveSession, closeSession, toggleNotifications, onClose, onOpenSettings]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [visible]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!visible) return null;

  // Group commands by category
  const grouped = new Map<string, Command[]>();
  for (const cmd of filteredCommands) {
    const group = grouped.get(cmd.category) || [];
    group.push(cmd);
    grouped.set(cmd.category, group);
  }

  let flatIndex = 0;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette__input-wrapper">
          <Search size={14} />
          <input
            ref={inputRef}
            className="command-palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
          />
        </div>

        <div className="command-palette__list">
          {filteredCommands.length === 0 ? (
            <div className="command-palette__empty">No commands found</div>
          ) : (
            Array.from(grouped.entries()).map(([category, cmds]) => (
              <div key={category}>
                <div className="command-palette__category">{category}</div>
                {cmds.map((cmd) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={cmd.id}
                      className={`command-palette__item ${
                        idx === selectedIndex ? 'command-palette__item--selected' : ''
                      }`}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="command-palette__item-icon">{cmd.icon}</span>
                      <span className="command-palette__item-label">{cmd.label}</span>
                      {cmd.shortcut && (
                        <span className="command-palette__item-shortcut">{cmd.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
