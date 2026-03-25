/**
 * Subscribes to session-store changes and auto-moves kanban cards
 * from "in-agent" to "done" when their target agent session completes.
 */

import { useEffect } from 'react';
import { useSessionStore } from '@/store/session-store';
import { useKanbanStore } from '@/store/kanban-store';

export function useAgentCardSync(): void {
  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state, prevState) => {
      const { cards, moveCard } = useKanbanStore.getState();

      // Find cards that are "in-agent" with an agentTarget
      const inAgentCards = cards.filter(
        (c) => c.status === 'in-agent' && c.agentTarget,
      );

      for (const card of inAgentCards) {
        const session = state.sessions[card.agentTarget!];
        const prevSession = prevState.sessions[card.agentTarget!];

        // If the session just transitioned to "done" or "idle" (finished),
        // or was removed entirely, move the card to done.
        const sessionFinished =
          session?.status === 'done' ||
          (session?.status === 'idle' &&
            prevSession?.status === 'running');

        const sessionRemoved = !session && prevSession != null;

        if (sessionFinished || sessionRemoved) {
          moveCard(card.id, 'done');
        }
      }
    });

    return unsubscribe;
  }, []);
}
