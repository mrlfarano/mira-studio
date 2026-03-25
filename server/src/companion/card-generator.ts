/**
 * Card Generator — uses the Companion AI engine to parse free-form text
 * ("brain dumps") into structured KanbanCard objects.
 */

import { randomUUID } from "node:crypto";
import type { CompanionEngine } from "./companion-engine.js";

// ---------------------------------------------------------------------------
// Output types (mirrors client-side KanbanCard shape)
// ---------------------------------------------------------------------------

export type KanbanPriority = "low" | "medium" | "high" | "critical";

export interface GeneratedCard {
  title: string;
  description: string;
  priority: KanbanPriority;
  context: { type: "file" | "url" | "note"; content: string }[];
}

export interface GenerateCardsResult {
  cards: GeneratedCard[];
}

// ---------------------------------------------------------------------------
// System prompt for card extraction
// ---------------------------------------------------------------------------

const CARD_EXTRACTION_PROMPT = `You are a task extraction assistant inside Mira Studio.
The user will paste free-form text — notes, ideas, brain dumps, meeting minutes, etc.
Your job is to parse this text into discrete, actionable task cards.

Return ONLY a JSON array (no markdown fences, no commentary). Each element must have:
- "title"       : string — short imperative title (max 80 chars)
- "description" : string — 1-2 sentence summary of the task
- "priority"    : "low" | "medium" | "high" | "critical"
- "context"     : array of { "type": "file" | "url" | "note", "content": string }

Priority heuristics:
- "critical" — blocking, urgent, or security-related
- "high"     — important but not blocking
- "medium"   — standard work items (default when unsure)
- "low"      — nice-to-have, polish, or exploratory

For "context", extract any file paths, URLs, or relevant notes from the surrounding text.
If a task has no obvious context items, use an empty array.

Always return at least one card. If the text is too vague for specific tasks, create a
single card titled "Review notes" with the original text as a note context item.`;

// ---------------------------------------------------------------------------
// Generator function
// ---------------------------------------------------------------------------

/**
 * Takes free-form text and uses the companion engine to parse it into
 * structured card data suitable for the Kanban board.
 */
export async function generateCardsFromText(
  engine: CompanionEngine,
  text: string,
): Promise<GenerateCardsResult> {
  // Use a dedicated session for card generation so it doesn't pollute chat history
  const sessionId = `card-gen-${randomUUID()}`;

  // Prepend extraction instructions into the user message so the companion
  // engine's default system prompt (personality, tone) is still applied but
  // the LLM knows what structured output we expect.
  const prompt = `${CARD_EXTRACTION_PROMPT}\n\n---\nHere is the user's brain dump:\n\n${text}`;

  // Collect the full streamed response
  let fullResponse = "";
  const stream = engine.chat(
    prompt,
    { metadata: { purpose: "card-generation" } },
    sessionId,
    {
      temperature: 0.3, // Lower temperature for more deterministic structured output
      maxTokens: 2048,
    },
  );

  for await (const chunk of stream) {
    fullResponse += chunk;
  }

  // Parse the JSON response
  const cards = parseCardResponse(fullResponse);
  return { cards };
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

const VALID_PRIORITIES = new Set<KanbanPriority>([
  "low",
  "medium",
  "high",
  "critical",
]);

const VALID_CONTEXT_TYPES = new Set(["file", "url", "note"]);

function parseCardResponse(response: string): GeneratedCard[] {
  // Try to extract JSON array from the response, handling potential markdown fences
  let jsonStr = response.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Find the JSON array boundaries
  const startIdx = jsonStr.indexOf("[");
  const endIdx = jsonStr.lastIndexOf("]");
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    // Fallback: return a single card with the raw text
    return [
      {
        title: "Review notes",
        description: "Could not parse structured tasks from the input.",
        priority: "medium",
        context: [{ type: "note", content: response.slice(0, 500) }],
      },
    ];
  }

  jsonStr = jsonStr.slice(startIdx, endIdx + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [
      {
        title: "Review notes",
        description: "Could not parse structured tasks from the input.",
        priority: "medium",
        context: [{ type: "note", content: response.slice(0, 500) }],
      },
    ];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [
      {
        title: "Review notes",
        description: "No tasks extracted from the input.",
        priority: "medium",
        context: [],
      },
    ];
  }

  // Validate and normalize each card
  return parsed.map((item: unknown) => normalizeCard(item)).filter(Boolean) as GeneratedCard[];
}

function normalizeCard(raw: unknown): GeneratedCard | null {
  if (typeof raw !== "object" || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  const title =
    typeof obj.title === "string" ? obj.title.slice(0, 120) : "Untitled task";
  const description =
    typeof obj.description === "string" ? obj.description : "";
  const priority = VALID_PRIORITIES.has(obj.priority as KanbanPriority)
    ? (obj.priority as KanbanPriority)
    : "medium";

  let context: GeneratedCard["context"] = [];
  if (Array.isArray(obj.context)) {
    context = obj.context
      .filter(
        (c: unknown) =>
          typeof c === "object" &&
          c !== null &&
          VALID_CONTEXT_TYPES.has((c as Record<string, unknown>).type as string) &&
          typeof (c as Record<string, unknown>).content === "string",
      )
      .map((c: unknown) => {
        const ctx = c as { type: string; content: string };
        return {
          type: ctx.type as "file" | "url" | "note",
          content: ctx.content,
        };
      });
  }

  return { title, description, priority, context };
}

/**
 * Returns the system prompt used for card generation.
 * Exported so the route can inject it as a system-level override.
 */
export function getCardGenerationSystemPrompt(): string {
  return CARD_EXTRACTION_PROMPT;
}
