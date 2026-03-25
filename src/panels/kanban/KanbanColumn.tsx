import React, { useCallback } from 'react';
import type { KanbanCard as KanbanCardType, KanbanStatus } from '@/types/kanban.ts';
import { useKanbanStore } from '@/store/kanban-store.ts';
import KanbanCard from './KanbanCard.tsx';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  columnId: KanbanStatus;
  title: string;
  cards: KanbanCardType[];
}

const KanbanColumn: React.FC<Props> = ({ columnId, title, cards }) => {
  const moveCard = useKanbanStore((s) => s.moveCard);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('text/plain');
      if (cardId) {
        moveCard(cardId, columnId);
      }
    },
    [moveCard, columnId],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: 1,
        minWidth: 180,
        display: 'flex',
        flexDirection: 'column',
        background: '#15152a',
        borderRadius: 8,
        padding: 8,
        gap: 0,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          padding: '0 4px',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: '#ccc' }}>
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#666',
            background: '#222',
            borderRadius: 10,
            padding: '1px 7px',
          }}
        >
          {cards.length}
        </span>
      </div>

      {/* Droppable area */}
      <div style={{ flex: 1, minHeight: 60, overflowY: 'auto' }}>
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(KanbanColumn);
