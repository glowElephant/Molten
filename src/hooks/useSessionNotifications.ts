import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { SessionStatus } from '../types';

/**
 * Hook that watches session status changes and creates notifications.
 */
export function useSessionNotifications() {
  const { sessions } = useSessionStore();
  const { addNotification } = useNotificationStore();
  const { settings } = useSettingsStore();
  const prevStatuses = useRef<Map<string, SessionStatus>>(new Map());

  useEffect(() => {
    const { notifications: notifSettings } = settings;
    if (!notifSettings.enabled) return;

    for (const [id, session] of sessions) {
      const prevStatus = prevStatuses.current.get(id);

      // Skip if no previous status (new session) or status unchanged
      if (!prevStatus || prevStatus === session.status) continue;

      // Check if we should notify for this status change
      let shouldNotify = false;
      let title = '';
      let body = '';

      switch (session.status) {
        case 'waiting':
          if (notifSettings.onWaiting) {
            shouldNotify = true;
            title = 'Input needed';
            body = `${session.name} is waiting for your input`;
          }
          break;
        case 'completed':
          if (notifSettings.onCompleted) {
            shouldNotify = true;
            title = 'Task completed';
            body = `${session.name} has finished`;
          }
          break;
        case 'error':
          if (notifSettings.onError) {
            shouldNotify = true;
            title = 'Error detected';
            body = `${session.name} encountered an error`;
          }
          break;
      }

      if (shouldNotify) {
        addNotification({
          title,
          body,
          sessionId: id,
        });
      }
    }

    // Update previous statuses
    const newStatuses = new Map<string, SessionStatus>();
    for (const [id, session] of sessions) {
      newStatuses.set(id, session.status);
    }
    prevStatuses.current = newStatuses;
  }, [sessions, settings, addNotification]);
}
