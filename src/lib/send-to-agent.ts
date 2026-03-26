/**
 * Assembles a context bundle from a KanbanCard and sends it to a PTY session
 * via the existing WebSocket infrastructure.
 */

import type { KanbanCard, ContextItem } from '@/types/kanban.ts';
import type { PtyInputMessage } from '@/types/ws-protocol';
import { NotificationType } from '@/types/notification';
import { WebSocketClient } from '@/lib/ws-client';
import { useKanbanStore } from '@/store/kanban-store';
import { useSessionStore } from '@/store/session-store';
import { useNotificationStore } from '@/store/notification-store';

// ---------------------------------------------------------------------------
// Prompt formatting
// ---------------------------------------------------------------------------

function formatContextItem(item: ContextItem): string {
  switch (item.type) {
    case 'file':
      return `[file] ${item.content}`;
    case 'url':
      return `[url]  ${item.content}`;
    case 'note':
      return `[note] ${item.content}`;
    default:
      return item.content;
  }
}

/**
 * Build a structured prompt string from a kanban card.
 */
export function buildPrompt(card: KanbanCard): string {
  const lines: string[] = [
    `# Task: ${card.title}`,
    '',
    card.description,
  ];

  if (card.context.length > 0) {
    lines.push('', '## Context', '');
    for (const item of card.context) {
      lines.push(formatContextItem(item));
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// One-shot WebSocket helper (fire a message into an existing PTY session)
// ---------------------------------------------------------------------------

function buildPtyUrl(sessionId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//127.0.0.1:3001/ws/pty/${sessionId}`;
}

/**
 * Open a transient WebSocket connection to a PTY session, send input data,
 * and close. The PTY session is expected to already be running.
 */
function sendToPty(sessionId: string, data: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const client = new WebSocketClient();
    const url = buildPtyUrl(sessionId);

    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('Timed out sending to PTY session'));
    }, 5_000);

    client.onStateChange((state) => {
      if (state === 'connected') {
        const msg: PtyInputMessage = { type: 'input', data };
        client.send(msg);

        // Give the message a moment to flush before closing
        setTimeout(() => {
          clearTimeout(timeout);
          client.close();
          resolve();
        }, 100);
      }
    });

    client.connect(url);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SendToAgentResult {
  success: boolean;
  error?: string;
}

/**
 * Send a kanban card to the target agent PTY session.
 *
 * 1. Assembles a structured prompt from the card.
 * 2. Sends the prompt as PTY input to the chosen session.
 * 3. Moves the card to the "in-agent" column in the kanban store.
 */
function notify(
  type: NotificationType,
  title: string,
  message: string,
  source: string,
): void {
  useNotificationStore.getState().addNotification({
    id: `send-agent-${Date.now()}`,
    type,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    source,
  });
}

/**
 * Send a kanban card to the target agent PTY session.
 *
 * 1. Validates the target session exists and is in a sendable state.
 * 2. Assembles a structured prompt from the card.
 * 3. Sends the prompt as PTY input to the chosen session.
 * 4. Moves the card to the "in-agent" column in the kanban store.
 * 5. Dispatches a notification on success or failure.
 */
export async function sendToAgent(
  card: KanbanCard,
  targetSessionId: string,
): Promise<SendToAgentResult> {
  // Validate session exists and is in a usable state
  const session = useSessionStore.getState().sessions[targetSessionId];
  if (!session) {
    const error = `Session "${targetSessionId}" not found`;
    notify(NotificationType.AgentError, 'Send to Agent failed', error, 'mira');
    return { success: false, error };
  }
  if (session.status === 'error') {
    const error = `Session "${session.agentName}" is in an error state`;
    notify(NotificationType.AgentError, 'Send to Agent failed', error, 'mira');
    return { success: false, error };
  }
  if (session.status === 'done') {
    const error = `Session "${session.agentName}" has ended`;
    notify(NotificationType.AgentError, 'Send to Agent failed', error, 'mira');
    return { success: false, error };
  }

  try {
    const prompt = buildPrompt(card);
    await sendToPty(targetSessionId, prompt);

    // Update kanban state
    const { moveCard, updateCard } = useKanbanStore.getState();
    updateCard(card.id, { agentTarget: targetSessionId });
    moveCard(card.id, 'in-agent');

    notify(
      NotificationType.System,
      'Sent to Agent',
      `"${card.title}" sent to ${session.agentName}`,
      session.agentName,
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    notify(NotificationType.AgentError, 'Send to Agent failed', message, 'mira');
    return { success: false, error: message };
  }
}
