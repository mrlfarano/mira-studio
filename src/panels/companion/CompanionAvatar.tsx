import React from 'react';

interface CompanionAvatarProps {
  onClick: () => void;
  hasUnread?: boolean;
}

/**
 * Collapsed companion state: a small circular avatar with a status dot.
 * Clicking expands the full companion panel.
 */
const CompanionAvatar: React.FC<CompanionAvatarProps> = ({ onClick, hasUnread = false }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Expand Mira companion"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        border: 'none',
        cursor: 'pointer',
        color: '#fff',
        fontSize: '18px',
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        margin: '8px auto',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
      }}
    >
      M
      {/* Status dot */}
      <span
        style={{
          position: 'absolute',
          bottom: '1px',
          right: '1px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: hasUnread ? '#f59e0b' : '#22c55e',
          border: '2px solid #16213e',
        }}
      />
    </button>
  );
};

export default React.memo(CompanionAvatar);
