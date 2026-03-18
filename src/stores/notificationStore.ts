import { create } from 'zustand';
import type { MoltenNotification } from '../types';

interface NotificationStore {
  notifications: MoltenNotification[];
  unreadCount: number;
  panelVisible: boolean;

  // Actions
  addNotification: (notification: Omit<MoltenNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  togglePanel: () => void;
  setPanelVisible: (visible: boolean) => void;
}

function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  panelVisible: false,

  addNotification: (notification) => {
    const newNotification: MoltenNotification = {
      ...notification,
      id: generateNotificationId(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead: (id: string) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.read) return state;

      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  removeNotification: (id: string) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const unreadDelta = notification && !notification.read ? 1 : 0;
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: Math.max(0, state.unreadCount - unreadDelta),
      };
    });
  },

  togglePanel: () => {
    set((state) => ({ panelVisible: !state.panelVisible }));
  },

  setPanelVisible: (visible: boolean) => {
    set({ panelVisible: visible });
  },
}));
