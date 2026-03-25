import React, { useCallback, useMemo, useState } from 'react';
import { useKanbanStore } from '@/store/kanban-store.ts';
import KanbanColumn from './KanbanColumn.tsx';
import BrainDumpInput from '@/components/BrainDumpInput.tsx';

// ---------------------------------------------------------------------------
// Board component — renders 4 columns: Idea, Specced, In Agent, Done
// ---------------------------------------------------------------------------

const KanbanBoard: React.FC = () => {
  const columns = useKanbanStore((s) => s.columns);
  const cards = useKanbanStore((s) => s.cards);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);

  const openBrainDump = useCallback(() => setBrainDumpOpen(true), []);
  const closeBrainDump = useCallback(() => setBrainDumpOpen(false), []);

  // Build a lookup map so columns can resolve their cards efficiently.
  const cardMap = useMemo(() => {
    const map = new Map<string, (typeof cards)[number]>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with Brain Dump button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '6px 8px',
          borderBottom: '1px solid #2a2a40',
          flexShrink: 0,
        }}
      >
        <button
          onClick={openBrainDump}
          style={{
            background: '#5b4fcf',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Brain Dump
        </button>
      </div>

      {/* Columns */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flex: 1,
          overflow: 'auto',
          padding: 4,
        }}
      >
        {columns.map((col) => {
          const colCards = col.cardIds
            .map((id) => cardMap.get(id))
            .filter((c): c is (typeof cards)[number] => c !== undefined);

          return (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              title={col.title}
              cards={colCards}
            />
          );
        })}
      </div>

      {/* Brain Dump modal */}
      <BrainDumpInput open={brainDumpOpen} onClose={closeBrainDump} />
    </div>
  );
};

export default React.memo(KanbanBoard);
