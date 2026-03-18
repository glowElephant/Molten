import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import './NotificationPanel.css';

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    panelVisible,
    markRead,
    markAllRead,
    clearAll,
    removeNotification,
    setPanelVisible,
  } = useNotificationStore();

  if (!panelVisible) return null;

  return (
    <div className="notification-panel">
      <div className="notification-panel__header">
        <div className="notification-panel__title">
          <Bell size={14} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="notification-panel__badge">{unreadCount}</span>
          )}
        </div>
        <div className="notification-panel__actions">
          {unreadCount > 0 && (
            <button
              className="notification-panel__action"
              onClick={markAllRead}
              title="Mark all read"
            >
              <CheckCheck size={14} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              className="notification-panel__action"
              onClick={clearAll}
              title="Clear all"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            className="notification-panel__action"
            onClick={() => setPanelVisible(false)}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="notification-panel__list">
        {notifications.length === 0 ? (
          <div className="notification-panel__empty">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${
                !notification.read ? 'notification-item--unread' : ''
              }`}
              onClick={() => markRead(notification.id)}
            >
              <div className="notification-item__content">
                <span className="notification-item__title">
                  {notification.title}
                </span>
                <span className="notification-item__body">
                  {notification.body}
                </span>
                <span className="notification-item__time">
                  {formatTime(notification.timestamp)}
                </span>
              </div>
              <button
                className="notification-item__dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString();
}
