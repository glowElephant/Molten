import { Bell } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { getStatusLabel } from '../../utils/statusDetector';
import './StatusBar.css';

export function StatusBar() {
  const { sessions, activeSessionId } = useSessionStore();
  const { unreadCount, togglePanel } = useNotificationStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const sessionCount = sessions.size;

  return (
    <div className="statusbar">
      <div className="statusbar__left">
        {activeSession && (
          <>
            <span className="statusbar__item">
              <span
                className="statusbar__status-dot"
                style={{
                  backgroundColor: `var(--color-status-${activeSession.status}, #6b7280)`,
                }}
              />
              {getStatusLabel(activeSession.status)}
            </span>
            {activeSession.metadata.model && (
              <span className="statusbar__item statusbar__item--muted">
                {activeSession.metadata.model}
              </span>
            )}
            {activeSession.metadata.tokensUsed > 0 && (
              <span className="statusbar__item statusbar__item--muted">
                {formatTokens(activeSession.metadata.tokensUsed)} tokens
              </span>
            )}
            {activeSession.metadata.costUsd > 0 && (
              <span className="statusbar__item statusbar__item--muted">
                ${activeSession.metadata.costUsd.toFixed(4)}
              </span>
            )}
          </>
        )}
      </div>

      <div className="statusbar__right">
        <span className="statusbar__item statusbar__item--muted">
          {sessionCount} session{sessionCount !== 1 ? 's' : ''}
        </span>

        <button
          className={`statusbar__notification-button ${
            unreadCount > 0 ? 'statusbar__notification-button--active' : ''
          }`}
          onClick={togglePanel}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell size={12} />
          {unreadCount > 0 && (
            <span className="statusbar__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}
