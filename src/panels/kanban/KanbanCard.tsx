import React, { useCallback, useMemo, useState } from 'react';
import type { KanbanCard as KanbanCardType, KanbanPriority } from '@/types/kanban.ts';
import { sendToAgent } from '@/lib/send-to-agent';
import { useSessionStore } from '@/store/session-store';

// ---------------------------------------------------------------------------
// Priority badge colours
// ---------------------------------------------------------------------------

const priorityColors: Record<KanbanPriority, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

// ---------------------------------------------------------------------------
// Sub-component: Agent session picker dropdown
// ---------------------------------------------------------------------------

interface SessionPickerProps {
  sessions: { id: string; agentName: string }[];
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
}

const SessionPicker: React.FC<SessionPickerProps> = ({
  sessions,
  onSelect,
  onCancel,
}) => (
  <div
    style={{
      position: 'absolute',
      right: 0,
      bottom: '100%',
      marginBottom: 4,
      background: '#2a2a3d',
      border: '1px solid #555',
      borderRadius: 6,
      padding: 6,
      zIndex: 10,
      minWidth: 160,
    }}
  >
    <div
      style={{ fontSize: 11, color: '#aaa', marginBottom: 4, fontWeight: 600 }}
    >
      Pick session:
    </div>
    {sessions.map((s) => (
      <button
        key={s.id}
        onClick={() => onSelect(s.id)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: '#ddd',
          fontSize: 11,
          padding: '4px 6px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#3a3a50';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        {s.agentName} ({s.id.slice(0, 6)})
      </button>
    ))}
    <button
      onClick={onCancel}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        color: '#888',
        fontSize: 10,
        padding: '4px 6px',
        marginTop: 2,
        cursor: 'pointer',
      }}
    >
      Cancel
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type SendState = 'idle' | 'picking' | 'sending' | 'sent' | 'error';

interface Props {
  card: KanbanCardType;
}

const KanbanCard: React.FC<Props> = ({ card }) => {
  const [sendState, setSendState] = useState<SendState>('idle');

  // Derive active sessions from session store
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessions = useMemo(
    () =>
      Object.values(sessions).filter(
        (s) => s.status === 'idle' || s.status === 'running',
      ),
    [sessions],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [card.id],
  );

  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const doSend = useCallback(
    async (sessionId: string) => {
      setSendState('sending');
      setErrorDetail(null);
      const result = await sendToAgent(card, sessionId);
      setSendState(result.success ? 'sent' : 'error');
      if (!result.success) {
        setErrorDetail(result.error ?? 'Unknown error');
      }

      // Reset visual feedback after a delay
      if (result.success) {
        setTimeout(() => setSendState('idle'), 2_000);
      } else {
        setTimeout(() => {
          setSendState('idle');
          setErrorDetail(null);
        }, 4_000);
      }
    },
    [card],
  );

  const handleSendClick = useCallback(() => {
    if (card.status === 'in-agent' || card.status === 'done') return;

    if (activeSessions.length === 0) {
      setSendState('error');
      setErrorDetail('No active agent sessions');
      setTimeout(() => {
        setSendState('idle');
        setErrorDetail(null);
      }, 3_000);
      return;
    }
    if (activeSessions.length === 1) {
      doSend(activeSessions[0].id);
    } else {
      setSendState('picking');
    }
  }, [activeSessions, card.status, doSend]);

  const handleSessionPick = useCallback(
    (sessionId: string) => {
      setSendState('idle');
      doSend(sessionId);
    },
    [doSend],
  );

  // ── Derive button label and style based on state ─────────────────────────

  const isInAgent = card.status === 'in-agent';
  const isDone = card.status === 'done';
  const disabled = isInAgent || isDone || sendState === 'sending';

  let buttonLabel = 'Send to Agent';
  let buttonBorder = '#555';
  let buttonColor = '#aaa';
  if (sendState === 'sending') {
    buttonLabel = 'Sending...';
    buttonBorder = '#f59e0b';
    buttonColor = '#f59e0b';
  } else if (sendState === 'sent') {
    buttonLabel = 'Sent!';
    buttonBorder = '#22c55e';
    buttonColor = '#22c55e';
  } else if (sendState === 'error') {
    buttonLabel = 'Failed';
    buttonBorder = '#ef4444';
    buttonColor = '#ef4444';
  } else if (isInAgent) {
    buttonLabel = 'In Agent';
    buttonBorder = '#7c3aed';
    buttonColor = '#7c3aed';
  } else if (isDone) {
    buttonLabel = 'Done';
    buttonBorder = '#22c55e';
    buttonColor = '#22c55e';
  }

  return (
    <div
      data-testid="kanban-card"
      draggable
      onDragStart={handleDragStart}
      style={{
        background: '#1e1e2f',
        border: '1px solid #333',
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 8,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 4,
          color: '#e2e2e2',
        }}
      >
        {card.title}
      </div>

      {/* Description preview */}
      {card.description && (
        <div
          style={{
            fontSize: 11,
            color: '#999',
            marginBottom: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.description}
        </div>
      )}

      {/* Footer: priority badge + send to agent */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '2px 6px',
            borderRadius: 4,
            background: priorityColors[card.priority] + '22',
            color: priorityColors[card.priority],
          }}
        >
          {card.priority}
        </span>

        <button
          data-testid="kanban-send-to-agent"
          disabled={disabled}
          style={{
            fontSize: 11,
            background: 'transparent',
            border: `1px solid ${buttonBorder}`,
            borderRadius: 4,
            color: buttonColor,
            padding: '2px 8px',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled && sendState !== 'sending' ? 0.7 : 1,
          }}
          onClick={handleSendClick}
        >
          {buttonLabel}
        </button>

        {/* Session picker overlay */}
        {sendState === 'picking' && (
          <SessionPicker
            sessions={activeSessions}
            onSelect={handleSessionPick}
            onCancel={() => setSendState('idle')}
          />
        )}
      </div>

      {/* Error detail */}
      {sendState === 'error' && errorDetail && (
        <div
          style={{
            fontSize: 10,
            color: '#ef4444',
            marginTop: 6,
            padding: '4px 6px',
            background: '#ef444411',
            borderRadius: 4,
          }}
        >
          {errorDetail}
        </div>
      )}
    </div>
  );
};

export default React.memo(KanbanCard);
