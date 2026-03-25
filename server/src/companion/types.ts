/**
 * Companion AI Engine — core type definitions.
 */

// ---------------------------------------------------------------------------
// LLM Adapter interface
// ---------------------------------------------------------------------------

export interface LLMAdapterOptions {
  /** Model identifier (e.g. "claude-sonnet-4-20250514", "llama3") */
  model?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature (0-1) */
  temperature?: number;

  /** Optional stop sequences */
  stopSequences?: string[];
}

/**
 * Unified adapter interface for any LLM provider.
 * `chat` returns an async generator that yields text chunks for streaming.
 */
export interface LLMAdapter {
  readonly name: string;

  /** Stream a chat completion. Yields incremental text deltas. */
  chat(
    messages: CompanionMessage[],
    options?: LLMAdapterOptions,
  ): AsyncGenerator<string>;
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type CompanionRole = "system" | "user" | "assistant";

export interface CompanionMessage {
  role: CompanionRole;
  content: string;
}

// ---------------------------------------------------------------------------
// Context passed into the engine alongside each user message
// ---------------------------------------------------------------------------

export interface CompanionContext {
  /** Current workspace name */
  workspace?: string;

  /** Active file path (relative to project root) */
  activeFile?: string;

  /** Recent terminal output (last N lines) */
  terminalHistory?: string[];

  /** Currently installed skill names */
  installedSkills?: string[];

  /** Git branch */
  gitBranch?: string;

  /** Arbitrary key-value metadata from the UI */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Action suggestions parsed from LLM responses
// ---------------------------------------------------------------------------

export type ActionSuggestionType = "config_change" | "skill_install" | "command";

export interface ActionSuggestion {
  type: ActionSuggestionType;
  /** Human-readable description */
  description: string;
  /** Machine-readable payload */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Session state tracked by the engine
// ---------------------------------------------------------------------------

export interface CompanionSession {
  /** Unique session ID */
  id: string;
  /** Conversation history */
  messages: CompanionMessage[];
  /** Current context snapshot */
  context: CompanionContext;
  /** Parsed action suggestions from the latest assistant turn */
  pendingActions: ActionSuggestion[];
  /** Timestamp of last activity */
  lastActivity: number;
}
