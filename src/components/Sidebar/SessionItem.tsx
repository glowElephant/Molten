import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { getStatusColor, getStatusLabel } from '../../utils/statusDetector';
import { useRipple } from '../RippleEffect';
import type { Session } from '../../types';

interface SessionItemProps {
  session: Session;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

export function SessionItem({ session, index, isActive, onClick }: SessionItemProps) {
  const { closeSession, renameSession } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    useLayoutStore.getState().removeFromLayout(session.id);
    closeSession(session.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(session.name);
    setIsEditing(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== session.name) {
      renameSession(session.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const statusColor = getStatusColor(session.status);
  const statusLabel = getStatusLabel(session.status);
  const { triggerRipple, rippleElements } = useRipple();

  return (
    <div
      className={`session-item ${isActive ? 'session-item--active' : ''} ${
        session.status === 'waiting' ? 'session-item--glow' : ''
      }`}
      onClick={(e) => { triggerRipple(e); onClick(); }}
      title={`${session.name} — ${statusLabel} (Ctrl+${index})`}
    >
      <div className="session-item__status">
        <span
          className={`session-item__dot ${
            session.status === 'thinking' ? 'session-item__dot--pulse' : ''
          }`}
          style={{ backgroundColor: statusColor }}
        />
      </div>
      {index <= 9 && (
        <span className="session-item__index">{index}</span>
      )}

      <div className="session-item__info">
        {isEditing ? (
          <input
            ref={inputRef}
            className="session-item__name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="session-item__name"
            onDoubleClick={handleDoubleClick}
          >
            {session.name}
          </span>
        )}
        <span className="session-item__meta">
          {session.metadata.gitBranch && (
            <span className="session-item__branch">{session.metadata.gitBranch}</span>
          )}
          {session.agentType && (
            <span className="session-item__agent">{session.agentType}</span>
          )}
        </span>
      </div>

      <button
        className="session-item__close"
        onClick={handleClose}
        aria-label={`Close ${session.name}`}
      >
        <X size={12} />
      </button>
      {rippleElements}
    </div>
  );
}
