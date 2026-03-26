import React, { useCallback, useRef, useEffect, useState } from 'react'
import { useCompanionStore } from '@/store/companion-store.ts'
import { useCompanionChat } from '@/hooks/useCompanionChat.ts'
import CompanionMessage from './CompanionMessage.tsx'
import CompanionAvatar from './CompanionAvatar.tsx'

// ---------------------------------------------------------------------------
// Typing indicator (three bouncing dots)
// ---------------------------------------------------------------------------

const TypingIndicator: React.FC = () => (
  <div
    style={{
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
      padding: '8px 12px',
      background: '#2a2a3e',
      borderRadius: '12px 12px 12px 2px',
      width: 'fit-content',
      marginBottom: '8px',
    }}
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#8b5cf6',
          opacity: 0.6,
          animation: `companionBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
        }}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Personality badge
// ---------------------------------------------------------------------------

const PersonalityBadge: React.FC<{ tone: string; verbosity: number }> = ({
  tone,
  verbosity,
}) => (
  <div
    style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      fontSize: '10px',
      color: '#888',
      padding: '4px 8px',
      background: '#1a1a2e',
      borderRadius: '4px',
    }}
  >
    <span>Tone: {tone}</span>
    <span
      style={{
        width: '1px',
        height: '10px',
        background: '#444',
      }}
    />
    <span>Verbosity: {verbosity}/5</span>
  </div>
);

// ---------------------------------------------------------------------------
// CompanionPanel
// ---------------------------------------------------------------------------

const CompanionPanel: React.FC = () => {
  const messages = useCompanionStore((s) => s.messages)
  const isExpanded = useCompanionStore((s) => s.isExpanded)
  const personality = useCompanionStore((s) => s.personality)
  const isStreaming = useCompanionStore((s) => s.isStreaming)
  const toggleExpanded = useCompanionStore((s) => s.toggleExpanded)

  const { sendMessage } = useCompanionChat()

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || isStreaming) return

    setInputValue('')
    void sendMessage(text)
  }, [inputValue, isStreaming, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // ---- Collapsed state ----
  if (!isExpanded) {
    return <CompanionAvatar onClick={toggleExpanded} hasUnread={messages.length > 0} />;
  }

  // ---- Expanded state ----
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontSize: '13px',
      }}
    >
      {/* Bounce keyframes (injected once) */}
      <style>{`
        @keyframes companionBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderBottom: '1px solid #2a2a3e',
          flexShrink: 0,
        }}
      >
        {personality ? (
          <PersonalityBadge tone={personality.tone} verbosity={personality.verbosity} />
        ) : (
          <span style={{ fontSize: '10px', color: '#666' }}>Mira Companion</span>
        )}
        <button
          onClick={toggleExpanded}
          aria-label="Collapse companion"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 4px',
          }}
          title="Collapse to avatar"
        >
          _
        </button>
      </div>

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', marginTop: '24px' }}>
            Start a conversation with Mira
          </div>
        )}
        {messages.map((msg) => (
          <CompanionMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '6px 8px',
          borderTop: '1px solid #2a2a3e',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Mira..."
          style={{
            flex: 1,
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#e0e0e0',
            fontSize: '13px',
            padding: '6px 10px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isStreaming}
          aria-label="Send message"
          style={{
            background: inputValue.trim() && !isStreaming ? '#6366f1' : '#333',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: inputValue.trim() && !isStreaming ? 'pointer' : 'default',
            fontSize: '13px',
            padding: '6px 14px',
            fontWeight: 600,
            transition: 'background 0.15s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default React.memo(CompanionPanel);
