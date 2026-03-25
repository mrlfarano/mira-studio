import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SnapshotMeta {
  name: string;
  capturedAt: string;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "16px",
  background: "#111827",
  borderRadius: "8px",
  minWidth: "280px",
  maxHeight: "480px",
  overflowY: "auto",
};

const headingStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: 0,
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#e5e7eb",
  fontSize: "13px",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "none",
  background: "#6366f1",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnDanger: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid #dc2626",
  background: "transparent",
  color: "#f87171",
  fontSize: "12px",
  cursor: "pointer",
};

const btnRestore: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid #6366f1",
  background: "transparent",
  color: "#a5b4fc",
  fontSize: "12px",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  background: "#1f2937",
  borderRadius: "8px",
};

const cardInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const cardNameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#e5e7eb",
};

const cardMetaStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
};

const cardActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
};

const emptyStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  textAlign: "center",
  padding: "16px 0",
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#f87171",
  padding: "4px 0",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SnapshotManager: React.FC = () => {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "restore" | "delete";
    name: string;
  } | null>(null);

  // -----------------------------------------------------------------------
  // Fetch snapshots
  // -----------------------------------------------------------------------

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshots");
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      const data = await res.json();
      setSnapshots(data.snapshots ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // -----------------------------------------------------------------------
  // Capture
  // -----------------------------------------------------------------------

  const handleCapture = useCallback(async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to capture snapshot");
      }
      setNewName("");
      await fetchSnapshots();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [newName, fetchSnapshots]);

  // -----------------------------------------------------------------------
  // Restore
  // -----------------------------------------------------------------------

  const handleRestore = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      setConfirmAction(null);

      try {
        const res = await fetch(`/api/snapshots/${encodeURIComponent(name)}/restore`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to restore snapshot");
        }
        await fetchSnapshots();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [fetchSnapshots],
  );

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  const handleDelete = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      setConfirmAction(null);

      try {
        const res = await fetch(`/api/snapshots/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to delete snapshot");
        }
        await fetchSnapshots();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [fetchSnapshots],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={panelStyle}>
      <h3 style={headingStyle}>Snapshots</h3>

      {/* Save new snapshot */}
      <div style={inputRowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Snapshot name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCapture();
          }}
          disabled={loading}
        />
        <button
          type="button"
          style={{
            ...btnPrimary,
            opacity: loading || !newName.trim() ? 0.5 : 1,
          }}
          onClick={handleCapture}
          disabled={loading || !newName.trim()}
        >
          Save
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Snapshot list */}
      {snapshots.length === 0 ? (
        <div style={emptyStyle}>No snapshots saved yet.</div>
      ) : (
        snapshots.map((snap) => (
          <div key={snap.name} style={cardStyle}>
            <div style={cardInfoStyle}>
              <span style={cardNameStyle}>{snap.name}</span>
              <span style={cardMetaStyle}>
                {formatDate(snap.capturedAt)} -- {formatSize(snap.sizeBytes)}
              </span>
            </div>

            <div style={cardActionsStyle}>
              {confirmAction?.name === snap.name ? (
                <>
                  <button
                    type="button"
                    style={
                      confirmAction.type === "delete" ? btnDanger : btnRestore
                    }
                    onClick={() =>
                      confirmAction.type === "delete"
                        ? handleDelete(snap.name)
                        : handleRestore(snap.name)
                    }
                    disabled={loading}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    style={{ ...btnRestore, color: "#9ca3af", borderColor: "#4b5563" }}
                    onClick={() => setConfirmAction(null)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    style={btnRestore}
                    onClick={() =>
                      setConfirmAction({ type: "restore", name: snap.name })
                    }
                    disabled={loading}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    style={btnDanger}
                    onClick={() =>
                      setConfirmAction({ type: "delete", name: snap.name })
                    }
                    disabled={loading}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default React.memo(SnapshotManager);
