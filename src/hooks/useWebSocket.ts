/**
 * Generic React hook wrapping WebSocketClient.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WebSocketClient,
  type ConnectionState,
} from "@/lib/ws-client";

export interface UseWebSocketReturn {
  send: <T>(msg: T) => void;
  lastMessage: unknown;
  connectionState: ConnectionState;
  reconnect: () => void;
}

export function useWebSocket(url: string | null): UseWebSocketReturn {
  const clientRef = useRef<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  // Stable client instance across renders
  if (clientRef.current === null) {
    clientRef.current = new WebSocketClient();
  }

  useEffect(() => {
    const client = clientRef.current!;

    const unsubState = client.onStateChange(setConnectionState);
    const unsubMsg = client.onMessage(setLastMessage);

    if (url) {
      client.connect(url);
    }

    return () => {
      unsubState();
      unsubMsg();
      client.close();
    };
  }, [url]);

  const send = useCallback(<T,>(msg: T) => {
    clientRef.current?.send(msg);
  }, []);

  const reconnect = useCallback(() => {
    clientRef.current?.reconnect();
  }, []);

  return useMemo(
    () => ({ send, lastMessage, connectionState, reconnect }),
    [send, lastMessage, connectionState, reconnect],
  );
}
