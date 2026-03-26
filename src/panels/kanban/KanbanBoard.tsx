import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKanbanStore } from '@/store/kanban-store.ts';
import type { KanbanPriority } from '@/types/kanban.ts';
import KanbanColumn from './KanbanColumn.tsx';
import BrainDumpInput from '@/components/BrainDumpInput.tsx';

const API_BASE = 'http://127.0.0.1:3001';

// ---------------------------------------------------------------------------
// Board component — renders 4 columns: Idea, Specced, In Agent, Done
// ---------------------------------------------------------------------------

const KanbanBoard: React.FC = () => {
  const columns = useKanbanStore((s) => s.columns);
  const cards = useKanbanStore((s) => s.cards);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);

  const [screenshotProcessing, setScreenshotProcessing] = useState(false);
  const addCard = useKanbanStore((s) => s.addCard);

  const openBrainDump = useCallback(() => setBrainDumpOpen(true), []);
  const closeBrainDump = useCallback(() => setBrainDumpOpen(false), []);

  const analyzeImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setScreenshotProcessing(true);
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
          ),
        );
        const res = await fetch(`${API_BASE}/api/companion/analyze-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: base64, mimeType: file.type }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error: string };
          throw new Error(err.error || 'Analysis failed');
        }
        const { card } = (await res.json()) as {
          card: { title: string; description: string; priority: string };
        };
        addCard({
          id: `card-${Date.now()}`,
          title: card.title,
          description: card.description,
          status: 'idea',
          priority: (card.priority || 'medium') as KanbanPriority,
          context: [{ type: 'note', content: 'Generated from screenshot' }],
        });
      } catch (err) {
        console.error('[KanbanBoard] Screenshot analysis failed:', err);
      } finally {
        setScreenshotProcessing(false);
      }
    },
    [addCard],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void analyzeImage(file);
    },
    [analyzeImage],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Paste handler for clipboard images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void analyzeImage(file);
            break;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [analyzeImage]);

  // Build a lookup map so columns can resolve their cards efficiently.
  const cardMap = useMemo(() => {
    const map = new Map<string, (typeof cards)[number]>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Header with Brain Dump button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: '1px solid #2a2a40',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: '#666' }}>
          {screenshotProcessing
            ? 'Analyzing screenshot...'
            : 'Drop screenshot or Ctrl+V to create task'}
        </span>
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
