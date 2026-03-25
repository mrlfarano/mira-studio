import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Notification } from "@/types/notification.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationState {
  notifications: Notification[];

  // --- actions ---
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;

  /** Bulk-replace state — used by hydration */
  _replace: (partial: Partial<NotificationState>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],

      addNotification: (notification) =>
        set(
          (s) => ({
            notifications: [notification, ...s.notifications],
          }),
          undefined,
          "notification/add",
        ),

      markRead: (id) =>
        set(
          (s) => ({
            notifications: s.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n,
            ),
          }),
          undefined,
          "notification/markRead",
        ),

      markAllRead: () =>
        set(
          (s) => ({
            notifications: s.notifications.map((n) => ({ ...n, read: true })),
          }),
          undefined,
          "notification/markAllRead",
        ),

      dismiss: (id) =>
        set(
          (s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
          }),
          undefined,
          "notification/dismiss",
        ),

      clearAll: () => set({ notifications: [] }, undefined, "notification/clearAll"),

      _replace: (partial) => set(partial, undefined, "notification/_replace"),
    }),
    { name: "NotificationStore", enabled: import.meta.env.DEV },
  ),
);
