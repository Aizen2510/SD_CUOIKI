export type NotificationKind = 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const EVENT_NAME = 'meocinema:notifications-updated';

export const notificationUserKey = (email?: string | null): string =>
  (email || 'guest').trim().toLowerCase();

const storageKey = (userKey: string) => `meo_notifications:${userKey}`;

export const getNotifications = (userKey: string): AppNotification[] => {
  try {
    const value = localStorage.getItem(storageKey(userKey));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addNotification = (
  userKey: string,
  notification: Pick<AppNotification, 'kind' | 'title' | 'message'>
): AppNotification => {
  const item: AppNotification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false
  };
  const items = [item, ...getNotifications(userKey)].slice(0, 50);
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(items));
  } catch {
    // The current page still receives the event if browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userKey } }));
  return item;
};

export const markNotificationsRead = (userKey: string): AppNotification[] => {
  const items = getNotifications(userKey).map((item) => ({ ...item, read: true }));
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(items));
  } catch {
    // Keep rendering the in-memory state if browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userKey } }));
  return items;
};

export const notificationsEventName = EVENT_NAME;
