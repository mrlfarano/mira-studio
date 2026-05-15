/**
 * CompanionEngine — orchestrates LLM interactions for the Mira companion.
 *
 * Responsibilities:
 *  - Assembles system prompts from companion.yml + workspace context
 *  - Reads .mira/memory.yml and injects it into the system prompt
 *  - Manages conversation sessions
 *  - Delegates to the active LLM adapter
 *  - Parses action suggestions from assistant responses
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { CompanionConfig } from "../config/types.js";
import type {
  LLMAdapter,
  CompanionMessage,
  CompanionContext,
  CompanionSession,
  ActionSuggestion,
  LLMAdapterOptions,
} from "./types.js";

export class CompanionEngine {
  private adapter: LLMAdapter;
  private companionConfig: CompanionConfig;
  private sessions: Map<string, CompanionSession> = new Map();
  private readonly projectRoot: string | undefined;

  /** Maximum messages to keep per session (system + history) */
  private readonly maxHistory = 50;

  /**
   * @param adapter       - Active LLM adapter
   * @param companionConfig - Loaded companion.yml config
   * @param projectRoot   - Optional absolute path to the project root;
   *                        when provided, `.mira/memory.yml` is read and
   *                        injected into the system prompt.
   */
  constructor(
    adapter: LLMAdapter,
    companionConfig: CompanionConfig,
    projectRoot?: string,
  ) {
    this.adapter = adapter;
    this.companionConfig = companionConfig;
    this.projectRoot = projectRoot;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Update companion personality at runtime (e.g. after config reload). */
  updateConfig(config: CompanionConfig): void {
    this.companionConfig = config;
  }

  /** Swap the active LLM adapter at runtime. */
  setAdapter(adapter: LLMAdapter): void {
    this.adapter = adapter;
  }

  /** Get or create a session. */
  getSession(sessionId?: string): CompanionSession {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    const session: CompanionSession = {
      id: sessionId ?? randomUUID(),
      messages: [],
      context: {},
      pendingActions: [],
      lastActivity: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Return current context for a session. */
  getContext(sessionId: string): CompanionContext {
    return this.getSession(sessionId).context;
  }

  /**
   * Stream a chat response.
   * Yields text chunks as they arrive; also accumulates the full response
   * for action parsing and history storage.
   */
  async *chat(
    userMessage: string,
    context: CompanionContext,
    sessionId?: string,
    options?: LLMAdapterOptions,
  ): AsyncGenerator<string> {
    const session = this.getSession(sessionId);
    session.context = context;
    session.lastActivity = Date.now();

    // Build the messages array: system prompt + history + new user message
    const systemPrompt = await this.buildSystemPrompt(context);
    const systemMsg: CompanionMessage = {
      role: "system",
      content: systemPrompt,
    };

    // Append user message to history
    session.messages.push({ role: "user", content: userMessage });

    // Trim history if needed (keep recent messages)
    if (session.messages.length > this.maxHistory) {
      session.messages = session.messages.slice(-this.maxHistory);
    }

    const fullMessages: CompanionMessage[] = [
      systemMsg,
      ...session.messages,
    ];

    // Stream from adapter
    let fullResponse = "";
    for await (const chunk of this.adapter.chat(fullMessages, options)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Store assistant response in history
    session.messages.push({ role: "assistant", content: fullResponse });

    // Parse any action suggestions
    session.pendingActions = this.parseActions(fullResponse);
  }

  // -------------------------------------------------------------------------
  // System prompt assembly
  // -------------------------------------------------------------------------

  /**
   * Build the system prompt for the companion.
   * Reads `.mira/memory.yml` from `projectRoot` (if set) and appends
   * its contents as a "Project memory" section so the LLM is aware of
   * project-local context on every request.
   *
   * Public so that tests and external integrations can inspect the assembled
   * prompt without issuing a full chat request.
   */
  async buildSystemPrompt(context: CompanionContext): Promise<string> {
    const cfg = this.companionConfig;
    const lines: string[] = [];

    // Identity
    lines.push(`You are ${cfg.name}, an AI companion inside Mira Studio.`);

    // Tone
    const toneMap: Record<string, string> = {
      Professional:
        "Respond in a professional, concise tone. Use precise technical language.",
      Casual:
        "Respond in a friendly, casual tone. Keep things approachable and collaborative.",
      Minimal:
        "Respond with minimal verbosity. Short answers, no fluff.",
    };
    lines.push(toneMap[cfg.tone] ?? toneMap.Casual);

    // Verbosity
    lines.push(
      `Verbosity level: ${cfg.verbosity}/5. ` +
        (cfg.verbosity <= 2
          ? "Be extremely concise."
          : cfg.verbosity >= 4
            ? "Provide detailed explanations when helpful."
            : "Balance brevity with clarity."),
    );

    // Workspace context
    if (context.workspace) {
      lines.push(`\nCurrent workspace: ${context.workspace}`);
    }
    if (context.activeFile) {
      lines.push(`Active file: ${context.activeFile}`);
    }
    if (context.gitBranch) {
      lines.push(`Git branch: ${context.gitBranch}`);
    }
    if (context.installedSkills?.length) {
      lines.push(`Installed skills: ${context.installedSkills.join(", ")}`);
    }
    if (context.terminalHistory?.length) {
      lines.push(
        `\nRecent terminal output:\n${context.terminalHistory.slice(-20).join("\n")}`,
      );
    }

    // Project memory from .mira/memory.yml
    const memory = await this.loadProjectMemory();
    if (memory) {
      lines.push(`\nProject memory:\n${memory}`);
    }

    // Action suggestion format
    lines.push(`
When you want to suggest an action the user can take, embed it in your response using this format:
[ACTION:config_change] {"key": "companion.tone", "value": "Professional"} — description
[ACTION:skill_install] {"name": "eslint-skill"} — description
[ACTION:command] {"cmd": "npm test"} — description
Only suggest actions when genuinely helpful. Do not force actions into every response.`);

    return lines.join("\n");
  }

  // -------------------------------------------------------------------------
  // Project memory
  // -------------------------------------------------------------------------

  /**
   * Read and parse `.mira/memory.yml` from `projectRoot`.
   * Returns the YAML-dumped string representation so it is human-readable
   * inside the system prompt. Returns `null` when:
   *  - `projectRoot` is not set
   *  - the file does not exist (ENOENT)
   *  - the file contains invalid YAML or a non-object value
   *  - any other I/O error
   */
  private async loadProjectMemory(): Promise<string | null> {
    if (!this.projectRoot) return null;

    try {
      const raw = await readFile(
        path.join(this.projectRoot, ".mira", "memory.yml"),
        "utf8",
      );
      const parsed = yaml.load(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return yaml.dump(parsed).trim();
    } catch (err: unknown) {
      // Silently skip missing file or any other read/parse error
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Action parsing
  // -------------------------------------------------------------------------

  private parseActions(response: string): ActionSuggestion[] {
    const actions: ActionSuggestion[] = [];
    const regex =
      /\[ACTION:(config_change|skill_install|command)\]\s*(\{[^}]+\})\s*(?:—|-)\s*(.+)/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(response)) !== null) {
      try {
        const payload = JSON.parse(match[2]) as Record<string, unknown>;
        actions.push({
          type: match[1] as ActionSuggestion["type"],
          description: match[3].trim(),
          payload,
        });
      } catch {
        // Malformed JSON in action — skip
      }
    }

    return actions;
  }
}
