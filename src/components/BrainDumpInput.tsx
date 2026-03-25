import React, { useCallback, useState } from 'react';
import { useKanbanStore } from '@/store/kanban-store.ts';
import type { KanbanCard, KanbanPriority, ContextItem } from '@/types/kanban.ts';

// ---------------------------------------------------------------------------
// Types matching server response
// ---------------------------------------------------------------------------

interface GeneratedCard {
  title: string;
  description: string;
  priority: KanbanPriority;
  context: ContextItem[];
}

type Phase = 'input' | 'loading' | 'preview';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let cardCounter = 0;

function makeId(): string {
  cardCounter += 1;
  return `bd-${Date.now()}-${cardCounter}`;
}

const priorityColors: Record<KanbanPriority, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
}

const BrainDumpInput: React.FC<Props> = ({ open, onClose }) => {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const addCard = useKanbanStore((s) => s.addCard);

  // ── Reset state when modal closes ────────────────────────────────────────

  const handleClose = useCallback(() => {
    setText('');
    setPhase('input');
    setGeneratedCards([]);
    setError(null);
    setSelectedIndices(new Set());
    onClose();
  }, [onClose]);

  // ── Generate cards via API ───────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;

    setPhase('loading');
    setError(null);

    try {
      const res = await fetch('/api/companion/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `Server error ${res.status}`);
      }

      const data = (await res.json()) as { cards: GeneratedCard[] };
      setGeneratedCards(data.cards);
      // Select all cards by default
      setSelectedIndices(new Set(data.cards.map((_, i) => i)));
      setPhase('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards');
      setPhase('input');
    }
  }, [text]);

  // ── Toggle card selection ────────────────────────────────────────────────

  const toggleCard = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // ── Confirm — add selected cards to Kanban Idea column ───────────────────

  const handleConfirm = useCallback(() => {
    for (const [i, card] of generatedCards.entries()) {
      if (!selectedIndices.has(i)) continue;

      const kanbanCard: KanbanCard = {
        id: makeId(),
        title: card.title,
        description: card.description,
        status: 'idea',
        priority: card.priority,
        context: card.context,
      };

      addCard(kanbanCard);
    }

    handleClose();
  }, [generatedCards, selectedIndices, addCard, handleClose]);

  // ── Keyboard shortcut: Ctrl/Cmd + Enter to submit ────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  if (!open) return null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #333',
          borderRadius: 12,
          width: 560,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #2a2a40',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e2e2' }}>
            Brain Dump
          </span>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
          {phase === 'input' && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste your notes, ideas, meeting minutes, or any free-form text here... Press Ctrl+Enter to generate."
                style={{
                  width: '100%',
                  minHeight: 180,
                  background: '#15152a',
                  border: '1px solid #333',
                  borderRadius: 8,
                  color: '#ddd',
                  fontSize: 13,
                  padding: 12,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
                  {error}
                </div>
              )}
            </>
          )}

          {phase === 'loading' && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#888',
                fontSize: 14,
              }}
            >
              Generating cards...
            </div>
          )}

          {phase === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                {generatedCards.length} card{generatedCards.length !== 1 ? 's' : ''} generated.
                Click to toggle selection.
              </div>
              {generatedCards.map((card, i) => {
                const selected = selectedIndices.has(i);
                return (
                  <div
                    key={i}
                    onClick={() => toggleCard(i)}
                    style={{
                      background: selected ? '#1e1e3a' : '#15152a',
                      border: `1px solid ${selected ? '#5555aa' : '#333'}`,
                      borderRadius: 6,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      opacity: selected ? 1 : 0.5,
                      transition: 'opacity 0.15s, border-color 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: '#e2e2e2',
                          flex: 1,
                        }}
                      >
                        {card.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: priorityColors[card.priority] + '22',
                          color: priorityColors[card.priority],
                        }}
                      >
                        {card.priority}
                      </span>
                    </div>
                    {card.description && (
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {card.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 18px',
            borderTop: '1px solid #2a2a40',
          }}
        >
          {phase === 'input' && (
            <button
              onClick={handleGenerate}
              disabled={!text.trim()}
              style={{
                background: text.trim() ? '#5b4fcf' : '#333',
                color: text.trim() ? '#fff' : '#666',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: text.trim() ? 'pointer' : 'default',
              }}
            >
              Generate Cards
            </button>
          )}

          {phase === 'preview' && (
            <>
              <button
                onClick={() => {
                  setPhase('input');
                  setGeneratedCards([]);
                  setSelectedIndices(new Set());
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #555',
                  borderRadius: 6,
                  color: '#aaa',
                  padding: '8px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIndices.size === 0}
                style={{
                  background: selectedIndices.size > 0 ? '#22c55e' : '#333',
                  color: selectedIndices.size > 0 ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selectedIndices.size > 0 ? 'pointer' : 'default',
                }}
              >
                Add {selectedIndices.size} Card{selectedIndices.size !== 1 ? 's' : ''} to Idea
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(BrainDumpInput);
