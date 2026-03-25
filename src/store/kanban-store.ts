import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { KanbanCard, KanbanColumn, KanbanStatus } from '@/types/kanban.ts';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface KanbanState {
  cards: KanbanCard[];
  columns: KanbanColumn[];

  // --- actions ---
  addCard: (card: KanbanCard) => void;
  moveCard: (cardId: string, toStatus: KanbanStatus) => void;
  updateCard: (cardId: string, patch: Partial<Omit<KanbanCard, 'id'>>) => void;
  deleteCard: (cardId: string) => void;
}

// ---------------------------------------------------------------------------
// Default columns
// ---------------------------------------------------------------------------

const defaultColumns: KanbanColumn[] = [
  { id: 'idea', title: 'Idea', cardIds: [] },
  { id: 'specced', title: 'Specced', cardIds: [] },
  { id: 'in-agent', title: 'In Agent', cardIds: [] },
  { id: 'done', title: 'Done', cardIds: [] },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useKanbanStore = create<KanbanState>()(
  devtools(
    (set) => ({
      cards: [],
      columns: defaultColumns.map((c) => ({ ...c, cardIds: [...c.cardIds] })),

      addCard: (card) =>
        set(
          (s) => ({
            cards: [...s.cards, card],
            columns: s.columns.map((col) =>
              col.id === card.status
                ? { ...col, cardIds: [...col.cardIds, card.id] }
                : col,
            ),
          }),
          undefined,
          'kanban/addCard',
        ),

      moveCard: (cardId, toStatus) =>
        set(
          (s) => ({
            cards: s.cards.map((c) =>
              c.id === cardId ? { ...c, status: toStatus } : c,
            ),
            columns: s.columns.map((col) => {
              // Remove from source column
              const filtered = col.cardIds.filter((id) => id !== cardId);
              // Add to target column
              if (col.id === toStatus) {
                return { ...col, cardIds: [...filtered, cardId] };
              }
              return { ...col, cardIds: filtered };
            }),
          }),
          undefined,
          'kanban/moveCard',
        ),

      updateCard: (cardId, patch) =>
        set(
          (s) => ({
            cards: s.cards.map((c) =>
              c.id === cardId ? { ...c, ...patch } : c,
            ),
          }),
          undefined,
          'kanban/updateCard',
        ),

      deleteCard: (cardId) =>
        set(
          (s) => ({
            cards: s.cards.filter((c) => c.id !== cardId),
            columns: s.columns.map((col) => ({
              ...col,
              cardIds: col.cardIds.filter((id) => id !== cardId),
            })),
          }),
          undefined,
          'kanban/deleteCard',
        ),
    }),
    { name: 'KanbanStore', enabled: import.meta.env.DEV },
  ),
);
