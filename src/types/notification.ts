// ---------------------------------------------------------------------------
// Notification types for the Smart Notifications system
// ---------------------------------------------------------------------------

export enum NotificationType {
  AgentComplete = "agent_complete",
  AgentError = "agent_error",
  AgentBlocked = "agent_blocked",
  MiraNudge = "mira_nudge",
  System = "system",
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  /** Origin of the notification (e.g. agent name, "mira", "system") */
  source: string;
}
