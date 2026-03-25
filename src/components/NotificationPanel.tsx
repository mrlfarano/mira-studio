import { useNotificationStore } from "@/store/notification-store.ts";
import type { Notification } from "@/types/notification.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_LABELS: Record<string, string> = {
  agent_complete: "Agent Complete",
  agent_error: "Agent Error",
  agent_blocked: "Agent Blocked",
  mira_nudge: "Mira Nudge",
  system: "System",
};

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

function NotificationRow({
  notification,
  onClickRead,
  onDismiss,
}: {
  notification: Notification;
  onClickRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClickRead(notification.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClickRead(notification.id);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border, #2a2a2a)",
        opacity: notification.read ? 0.55 : 1,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--muted, #888)" }}>
          {TYPE_LABELS[notification.type] ?? notification.type}
        </span>
        <span style={{ fontSize: 10, color: "var(--muted, #888)" }}>
          {formatTimestamp(notification.timestamp)}
        </span>
      </div>

      {/* Title + unread dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {!notification.read && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--accent, #6366f1)",
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {notification.title}
        </span>
      </div>

      {/* Message */}
      <span style={{ fontSize: 12, color: "var(--muted, #aaa)" }}>
        {notification.message}
      </span>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        aria-label="Dismiss notification"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          color: "var(--muted, #888)",
          lineHeight: 1,
          padding: 2,
        }}
      >
        x
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

/**
 * Expandable notification panel.
 *
 * Displays full notification history with timestamps. Clicking a
 * notification marks it as read. Uses subtle inline indicators rather
 * than modal popups so it never interrupts flow state.
 */
export function NotificationPanel() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--panel-bg, #1a1a1a)",
        color: "var(--fg, #e0e0e0)",
        fontSize: 13,
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--border, #2a2a2a)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--accent, #6366f1)",
              }}
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--muted, #888)",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--muted, #888)",
              fontSize: 12,
            }}
          >
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onClickRead={markRead}
              onDismiss={dismiss}
            />
          ))
        )}
      </div>
    </div>
  );
}
