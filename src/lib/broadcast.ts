/**
 * Broadcast a prompt to multiple agent PTY sessions simultaneously.
 */

const API_BASE = 'http://127.0.0.1:3001'

export interface BroadcastResult {
  sent: string[]
  failed: { sessionId: string; error: string }[]
}

/**
 * Send input data to multiple PTY sessions via the broadcast REST endpoint.
 * Returns which sessions received the input and which failed.
 */
export async function broadcastToAgents(
  data: string,
  sessionIds: string[],
): Promise<BroadcastResult> {
  const res = await fetch(`${API_BASE}/api/pty/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, sessionIds }),
  })

  if (!res.ok) {
    throw new Error(`Broadcast failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as BroadcastResult
}
