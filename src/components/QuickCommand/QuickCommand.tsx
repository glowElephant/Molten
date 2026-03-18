import { useState, useRef, useEffect } from 'react';
import { Play, Plus, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSessionStore } from '../../stores/sessionStore';
import { useQuickCommandStore } from '../../stores/quickCommandStore';
import './QuickCommand.css';

export function QuickCommandBar() {
  const { commands, addCommand, removeCommand } = useQuickCommandStore();
  const { activeSessionId } = useSessionStore();
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCmd, setNewCmd] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first command
  useEffect(() => {
    if (!selectedId && commands.length > 0) {
      setSelectedId(commands[0].id);
    }
  }, [commands, selectedId]);

  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  const handleRun = () => {
    if (!activeSessionId || !selectedId) return;
    const cmd = commands.find((c) => c.id === selectedId);
    if (!cmd) return;
    invoke('pty_write', { sessionId: activeSessionId, data: cmd.command + '\n' }).catch(() => {});
  };

  const handleAdd = () => {
    const trimName = newName.trim();
    const trimCmd = newCmd.trim();
    if (!trimName || !trimCmd) return;
    const id = addCommand(trimName, trimCmd);
    setSelectedId(id);
    setNewName('');
    setNewCmd('');
    setIsAdding(false);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    removeCommand(selectedId);
    setSelectedId(commands.length > 1 ? commands.find((c) => c.id !== selectedId)?.id || '' : '');
  };

  if (isAdding) {
    return (
      <div className="quick-cmd">
        <input
          ref={nameInputRef}
          className="quick-cmd__input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
        />
        <input
          className="quick-cmd__input quick-cmd__input--wide"
          value={newCmd}
          onChange={(e) => setNewCmd(e.target.value)}
          placeholder="Command (e.g. npm run dev)"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
        />
        <button className="quick-cmd__btn quick-cmd__btn--accent" onClick={handleAdd} title="Save">
          <Plus size={12} />
        </button>
        <button className="quick-cmd__btn" onClick={() => setIsAdding(false)} title="Cancel">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="quick-cmd">
      <select
        className="quick-cmd__select"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {commands.length === 0 && <option value="">No commands</option>}
        {commands.map((cmd) => (
          <option key={cmd.id} value={cmd.id}>
            {cmd.name}
          </option>
        ))}
      </select>
      <button
        className="quick-cmd__btn quick-cmd__btn--run"
        onClick={handleRun}
        disabled={!selectedId || !activeSessionId}
        title="Run command"
      >
        <Play size={11} /> Run
      </button>
      <button className="quick-cmd__btn" onClick={() => setIsAdding(true)} title="Add command">
        <Plus size={12} />
      </button>
      {selectedId && (
        <button className="quick-cmd__btn quick-cmd__btn--danger" onClick={handleDelete} title="Delete selected">
          <X size={12} />
        </button>
      )}
    </div>
  );
}
