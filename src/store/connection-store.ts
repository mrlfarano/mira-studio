/**
 * Zustand store tracking all active WebSocket connections and their states.
 */

import { create } from "zustand";
import type { ConnectionState } from "@/lib/ws-client";

export interface ConnectionEntry {
  id: string;
  url: string;
  state: ConnectionState;
}

interface ConnectionStoreState {
  connections: Map<string, ConnectionEntry>;

  registerConnection: (id: string, url: string) => void;
  unregisterConnection: (id: string) => void;
  updateConnectionState: (id: string, state: ConnectionState) => void;

  /** Get a snapshot of all connection entries. */
  getAll: () => ConnectionEntry[];
}

export const useConnectionStore = create<ConnectionStoreState>(
  (set, get) => ({
    connections: new Map(),

    registerConnection: (id, url) => {
      set((prev) => {
        const next = new Map(prev.connections);
        next.set(id, { id, url, state: "disconnected" });
        return { connections: next };
      });
    },

    unregisterConnection: (id) => {
      set((prev) => {
        const next = new Map(prev.connections);
        next.delete(id);
        return { connections: next };
      });
    },

    updateConnectionState: (id, state) => {
      set((prev) => {
        const entry = prev.connections.get(id);
        if (!entry) return prev;
        const next = new Map(prev.connections);
        next.set(id, { ...entry, state });
        return { connections: next };
      });
    },

    getAll: () => Array.from(get().connections.values()),
  }),
);
