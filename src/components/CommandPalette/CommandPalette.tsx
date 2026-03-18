import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus, Settings, Bell, Sidebar,
  X as XIcon, Layout,
  Terminal, Search, ArrowRight, Radio
} from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useMessageBusStore } from '../../stores/messageBusStore';
import type { LayoutNode } from '../../stores/layoutStore';
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

  const { sessions, activeSessionId, createSession, setActiveSession, closeSession } = useSessionStore();
  const { settings } = useSettingsStore();
  const { togglePanel: toggleNotifications } = useNotificationStore();

  // Apply a workspace preset: create sessions and set layout
  const applyPreset = useCallback((presetName: string) => {
    const preset = useWorkspaceStore.getState().getPreset(presetName);
    if (!preset) return;

    if (!preset.layout) {
      // Focus mode: single session
      useLayoutStore.getState().setLayout(null);
      if (sessions.size === 0) createSession();
      return;
    }

    // Create required sessions
    const sessionIds: string[] = [];
    for (let i = 0; i < preset.sessionCount; i++) {
      sessionIds.push(useSessionStore.getState().createSession());
    }

    // Replace placeholder IDs in layout with real session IDs
    const resolveLayout = (node: any): LayoutNode => {
      if (node.type === 'terminal') {
        const match = node.sessionId?.match(/__placeholder_(\d+)__/);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          return { type: 'terminal', sessionId: sessionIds[idx] || sessionIds[0] };
        }
        return node;
      }
      if (node.type === 'split' && node.children) {
        return {
          ...node,
          children: node.children.map(resolveLayout),
        };
      }
      return node;
    };

    const resolvedLayout = resolveLayout(preset.layout);
    useLayoutStore.getState().setLayout(resolvedLayout);
  }, [sessions, createSession]);

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
          if (prevActive) {
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
          if (prevActive) {
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
      // Workspace presets
      ...useWorkspaceStore.getState().presets.map((preset) => ({
        id: `preset-${preset.name}`,
        label: `Workspace: ${preset.name}`,
        icon: <Layout size={14} />,
        action: () => {
          applyPreset(preset.name);
          onClose();
        },
        category: 'Workspace',
      })),
      // Pipe commands — send data between sessions
      ...Array.from(sessions.values())
        .filter((s) => s.id !== activeSessionId)
        .map((target) => ({
          id: `pipe-last-to-${target.id}`,
          label: `Pipe: Send last output → ${target.name}`,
          icon: <ArrowRight size={14} />,
          action: () => {
            if (!activeSessionId) return;
            const content = useMessageBusStore.getState().getLastOutput(activeSessionId);
            if (content) {
              useMessageBusStore.getState().sendToSession(activeSessionId, target.id, content);
            }
            onClose();
          },
          category: 'Pipe',
        })),
      ...Array.from(sessions.values())
        .filter((s) => s.id !== activeSessionId)
        .map((target) => ({
          id: `pipe-text-to-${target.id}`,
          label: `Pipe: Send text → ${target.name}`,
          icon: <ArrowRight size={14} />,
          action: () => {
            onClose();
            setTimeout(() => {
              const text = window.prompt(`Send to ${target.name}:`);
              if (text && activeSessionId) {
                useMessageBusStore.getState().sendToSession(activeSessionId, target.id, text + '\n');
              }
            }, 50);
          },
          category: 'Pipe',
        })),
      ...(sessions.size > 1 ? [{
        id: 'broadcast-all',
        label: 'Pipe: Broadcast to all sessions',
        icon: <Radio size={14} />,
        action: () => {
          onClose();
          setTimeout(() => {
            const text = window.prompt('Broadcast to all sessions:');
            if (text && activeSessionId) {
              useMessageBusStore.getState().broadcast(activeSessionId, text + '\n');
            }
          }, 50);
        },
        category: 'Pipe',
      }] : []),
    ];
    return cmds;
  }, [sessions, activeSessionId, settings, createSession, setActiveSession, closeSession, toggleNotifications, onClose, onOpenSettings]);

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
