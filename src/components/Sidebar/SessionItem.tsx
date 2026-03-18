import { X } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { getStatusColor, getStatusLabel } from '../../utils/statusDetector';
import type { Session } from '../../types';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

export function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  const { closeSession } = useSessionStore();

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeSession(session.id);
  };

  const statusColor = getStatusColor(session.status);
  const statusLabel = getStatusLabel(session.status);

  return (
    <div
      className={`session-item ${isActive ? 'session-item--active' : ''} ${
        session.status === 'waiting' ? 'session-item--glow' : ''
      }`}
      onClick={onClick}
      title={`${session.name} — ${statusLabel}`}
    >
      <div className="session-item__status">
        <span
          className={`session-item__dot ${
            session.status === 'thinking' ? 'session-item__dot--pulse' : ''
          }`}
          style={{ backgroundColor: statusColor }}
        />
      </div>

      <div className="session-item__info">
        <span className="session-item__name">{session.name}</span>
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
    </div>
  );
}
