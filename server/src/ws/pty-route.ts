/**
 * Fastify WebSocket route for PTY sessions.
 *
 * Route: /ws/pty/:sessionId
 *
 * Clients connect with an existing sessionId to attach, or send a "spawn"
 * message to create a new session (sessionId in the URL can be "new").
 */

import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { PtyManager } from "../pty/pty-manager.js";
import type {
  ClientMessage,
  ServerMessage,
} from "../pty/pty-protocol.js";

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function registerPtyRoutes(
  server: FastifyInstance,
  manager: PtyManager,
): void {
  server.get(
    "/ws/pty/:sessionId",
    { websocket: true },
    (socket, request) => {
      const params = request.params as { sessionId: string };
      let sessionId: string | null = null;

      // If the client is connecting to an existing session, replay buffer
      if (params.sessionId !== "new" && manager.has(params.sessionId)) {
        sessionId = params.sessionId;
        replayBuffer(socket, manager, sessionId);
      }

      // ── Listeners that forward PTY events to the WebSocket client ──

      const onOutput = (id: string, data: string) => {
        if (id === sessionId) {
          send(socket, { type: "output", data });
        }
      };

      const onStatus = (id: string, status: string) => {
        if (id === sessionId) {
          send(socket, {
            type: "status",
            status: status as any,
            sessionId: id,
          } as ServerMessage);
        }
      };

      const onExit = (id: string, exitCode: number, signal?: number) => {
        if (id === sessionId) {
          send(socket, { type: "exit", exitCode, signal });
        }
      };

      manager.on("output", onOutput);
      manager.on("status", onStatus);
      manager.on("exit", onExit);

      // ── Handle incoming messages from the client ──

      socket.on("message", (raw: Buffer | string) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
        } catch {
          send(socket, { type: "error", message: "Invalid JSON" });
          return;
        }

        try {
          switch (msg.type) {
            case "spawn": {
              if (sessionId && manager.has(sessionId)) {
                send(socket, {
                  type: "error",
                  message: "Session already spawned on this connection",
                });
                return;
              }
              const requestedId =
                params.sessionId !== "new" ? params.sessionId : undefined;
              sessionId = manager.spawn(
                requestedId,
                msg.shell,
                msg.cols,
                msg.rows,
              );
              send(socket, { type: "spawned", sessionId });
              break;
            }

            case "input": {
              if (!sessionId) {
                send(socket, { type: "error", message: "No active session" });
                return;
              }
              manager.write(sessionId, msg.data);
              break;
            }

            case "resize": {
              if (!sessionId) {
                send(socket, { type: "error", message: "No active session" });
                return;
              }
              manager.resize(sessionId, msg.cols, msg.rows);
              break;
            }

            case "kill": {
              if (!sessionId) {
                send(socket, { type: "error", message: "No active session" });
                return;
              }
              manager.kill(sessionId).catch(() => {});
              sessionId = null;
              break;
            }

            default:
              send(socket, {
                type: "error",
                message: `Unknown message type: ${(msg as any).type}`,
              });
          }
        } catch (err: any) {
          send(socket, {
            type: "error",
            message: err.message ?? "Internal error",
          });
        }
      });

      // ── Cleanup when the WebSocket disconnects ──

      socket.on("close", () => {
        manager.removeListener("output", onOutput);
        manager.removeListener("status", onStatus);
        manager.removeListener("exit", onExit);
        // Note: we do NOT kill the PTY session when the WS disconnects.
        // The session stays alive so another client can reconnect (session replay).
      });
    },
  );
}

/** Send buffered output so a reconnecting client gets the full history. */
function replayBuffer(
  ws: WebSocket,
  manager: PtyManager,
  sessionId: string,
): void {
  const lines = manager.getBufferedOutput(sessionId);
  for (const data of lines) {
    send(ws, { type: "output", data });
  }
  const status = manager.getStatus(sessionId);
  if (status) {
    send(ws, { type: "status", status, sessionId });
  }
}
