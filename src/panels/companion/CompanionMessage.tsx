import React from 'react'
import type {
  CompanionMessage as CompanionMessageType,
  ActionSuggestion,
} from '@/store/companion-store.ts'

// ---------------------------------------------------------------------------
// Action chip style helpers
// ---------------------------------------------------------------------------

const ACTION_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  config_change: { bg: '#1e293b', border: '#3b82f6', icon: '\u2699' },
  skill_install: { bg: '#1e2a1e', border: '#22c55e', icon: '\u2B07' },
  command: { bg: '#2a1e2e', border: '#a855f7', icon: '\u25B6' },
}

const ActionChip: React.FC<{ action: ActionSuggestion }> = ({ action }) => {
  const palette = ACTION_COLORS[action.type] ?? ACTION_COLORS.command

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        margin: '2px 4px 2px 0',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: '14px',
        color: '#d1d5db',
        fontSize: '11px',
        cursor: 'pointer',
        lineHeight: 1.4,
        transition: 'opacity 0.15s',
      }}
      title={`${action.type}: ${JSON.stringify(action.payload)}`}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.8'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
      }}
    >
      <span>{palette.icon}</span>
      <span>{action.description}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// CompanionMessage
// ---------------------------------------------------------------------------

interface CompanionMessageProps {
  message: CompanionMessageType
}

const CompanionMessage: React.FC<CompanionMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp)
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const actions = message.actions

  return (
    <div
      data-testid="companion-message"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          background: isUser ? '#3a5fc8' : '#2a2a3e',
          color: '#e0e0e0',
          fontSize: '13px',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {!isUser && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#8b5cf6',
              marginBottom: '2px',
            }}
          >
            Mira
          </div>
        )}
        {message.text}
        {/* Render action suggestion chips below the message text */}
        {actions && actions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid #3a3a4e',
            }}
          >
            {actions.map((action, idx) => (
              <ActionChip key={`${action.type}-${idx}`} action={action} />
            ))}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: '10px',
          color: '#666',
          marginTop: '2px',
          paddingLeft: isUser ? 0 : '4px',
          paddingRight: isUser ? '4px' : 0,
        }}
      >
        {timeStr}
      </span>
    </div>
  )
}

export default React.memo(CompanionMessage)
