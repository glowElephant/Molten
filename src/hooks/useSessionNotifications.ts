import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { SessionStatus } from '../types';

/**
 * Hook that watches session status changes and creates notifications.
 * Only notifies for meaningful status transitions (not initial creation).
 */
export function useSessionNotifications() {
  const { sessions } = useSessionStore();
  const { addNotification } = useNotificationStore();
  const { settings } = useSettingsStore();
  const prevStatuses = useRef<Map<string, SessionStatus>>(new Map());
  const sessionCreatedAt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const { notifications: notifSettings } = settings;
    if (!notifSettings.enabled) return;

    const now = Date.now();

    for (const [id, session] of sessions) {
      const prevStatus = prevStatuses.current.get(id);

      // Track when sessions are first seen
      if (!sessionCreatedAt.current.has(id)) {
        sessionCreatedAt.current.set(id, now);
      }

      // Skip if no previous status (brand new session)
      if (!prevStatus) continue;

      // Skip if status unchanged
      if (prevStatus === session.status) continue;

      // Skip if session was created less than 5 seconds ago (startup noise)
      const age = now - (sessionCreatedAt.current.get(id) || now);
      if (age < 5000) continue;

      // Skip idle→completed transitions (process exited without doing anything meaningful)
      if (prevStatus === 'idle' && session.status === 'completed') continue;

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

    // Clean up removed sessions
    for (const id of sessionCreatedAt.current.keys()) {
      if (!sessions.has(id)) {
        sessionCreatedAt.current.delete(id);
      }
    }
  }, [sessions, settings, addNotification]);
}
