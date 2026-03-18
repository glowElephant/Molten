import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('NotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      panelVisible: false,
    });
  });

  it('should start with empty notifications', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
    expect(state.panelVisible).toBe(false);
  });

  it('should add a notification', () => {
    useNotificationStore.getState().addNotification({
      title: 'Test',
      body: 'Test body',
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.notifications[0].title).toBe('Test');
    expect(state.notifications[0].read).toBe(false);
  });

  it('should mark notification as read', () => {
    useNotificationStore.getState().addNotification({ title: 'A', body: 'a' });
    const id = useNotificationStore.getState().notifications[0].id;

    useNotificationStore.getState().markRead(id);

    const state = useNotificationStore.getState();
    expect(state.notifications[0].read).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('should not double-decrement unread count', () => {
    useNotificationStore.getState().addNotification({ title: 'A', body: 'a' });
    const id = useNotificationStore.getState().notifications[0].id;

    useNotificationStore.getState().markRead(id);
    useNotificationStore.getState().markRead(id); // Second call

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('should mark all as read', () => {
    useNotificationStore.getState().addNotification({ title: 'A', body: 'a' });
    useNotificationStore.getState().addNotification({ title: 'B', body: 'b' });

    useNotificationStore.getState().markAllRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it('should remove a notification', () => {
    useNotificationStore.getState().addNotification({ title: 'A', body: 'a' });
    const id = useNotificationStore.getState().notifications[0].id;

    useNotificationStore.getState().removeNotification(id);

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('should clear all notifications', () => {
    useNotificationStore.getState().addNotification({ title: 'A', body: 'a' });
    useNotificationStore.getState().addNotification({ title: 'B', body: 'b' });

    useNotificationStore.getState().clearAll();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it('should toggle panel visibility', () => {
    useNotificationStore.getState().togglePanel();
    expect(useNotificationStore.getState().panelVisible).toBe(true);

    useNotificationStore.getState().togglePanel();
    expect(useNotificationStore.getState().panelVisible).toBe(false);
  });

  it('should order notifications newest first', () => {
    useNotificationStore.getState().addNotification({ title: 'First', body: '' });
    useNotificationStore.getState().addNotification({ title: 'Second', body: '' });

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs[0].title).toBe('Second');
    expect(notifs[1].title).toBe('First');
  });
});
