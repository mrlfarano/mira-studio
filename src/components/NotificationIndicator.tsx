import { useNotificationStore } from "@/store/notification-store.ts";

/**
 * Subtle unread-notification badge.
 *
 * Renders a small dot with an unread count. Designed to sit in a corner
 * or toolbar without interrupting flow state (per PRD guidelines).
 */
export function NotificationIndicator({
  onClick,
}: {
  onClick?: () => void;
}) {
  const unreadCount = useNotificationStore((s) =>
    s.notifications.filter((n) => !n.read).length,
  );

  if (unreadCount === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
      }}
    >
      {/* Subtle dot */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: "var(--accent, #6366f1)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "0 5px",
          lineHeight: 1,
        }}
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    </button>
  );
}
