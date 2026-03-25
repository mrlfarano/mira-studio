import React from 'react';
import type { CompanionMessage as CompanionMessageType } from '@/store/companion-store.ts';

interface CompanionMessageProps {
  message: CompanionMessageType;
}

const CompanionMessage: React.FC<CompanionMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
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
  );
};

export default React.memo(CompanionMessage);
