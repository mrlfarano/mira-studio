/**
 * WebSocket client manager with auto-reconnect and typed messaging.
 */

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export type MessageHandler = (data: unknown) => void;
export type StateChangeHandler = (state: ConnectionState) => void;

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url = "";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private _state: ConnectionState = "disconnected";

  private messageHandlers = new Set<MessageHandler>();
  private stateHandlers = new Set<StateChangeHandler>();

  // ── Public API ──────────────────────────────────────────────────────────

  get state(): ConnectionState {
    return this._state;
  }

  connect(url: string): void {
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  send<T>(msg: T): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  reconnect(): void {
    this.close();
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private openSocket(): void {
    this.setState(
      this.reconnectAttempts > 0 ? "reconnecting" : "connecting",
    );

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState("connected");
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        this.setState("disconnected");
      }
    };

    this.ws.onerror = () => {
      // onclose fires after onerror, so reconnection is handled there.
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }
      for (const handler of this.messageHandlers) {
        handler(parsed);
      }
    };
  }

  private scheduleReconnect(): void {
    this.setState("reconnecting");
    const delay = Math.min(
      MIN_BACKOFF_MS * Math.pow(2, this.reconnectAttempts),
      MAX_BACKOFF_MS,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(next: ConnectionState): void {
    if (this._state === next) return;
    this._state = next;
    for (const handler of this.stateHandlers) {
      handler(next);
    }
  }
}
