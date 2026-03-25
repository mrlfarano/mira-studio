/**
 * Kanban board types.
 */

export type KanbanStatus = 'idea' | 'specced' | 'in-agent' | 'done';

export type KanbanPriority = 'low' | 'medium' | 'high' | 'critical';

/** A single piece of context attached to a card. */
export interface ContextItem {
  type: 'file' | 'url' | 'note';
  content: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  context: ContextItem[];
  agentTarget?: string;
}

export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  cardIds: string[];
}
