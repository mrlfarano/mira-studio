/**
 * ClaudeAdapter — LLM adapter backed by the Anthropic Messages API.
 *
 * Uses @anthropic-ai/sdk for streaming completions.
 * Requires ANTHROPIC_API_KEY environment variable.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMAdapter,
  LLMAdapterOptions,
  CompanionMessage,
} from "../types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;

export class ClaudeAdapter implements LLMAdapter {
  readonly name = "claude";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async *chat(
    messages: CompanionMessage[],
    options?: LLMAdapterOptions,
  ): AsyncGenerator<string> {
    // Separate system prompt from conversation messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const system = systemMessages.map((m) => m.content).join("\n\n") || undefined;

    // Map to Anthropic message format
    const anthropicMessages = conversationMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Ensure conversation starts with a user message (API requirement)
    if (anthropicMessages.length === 0 || anthropicMessages[0].role !== "user") {
      anthropicMessages.unshift({ role: "user", content: "(start)" });
    }

    const stream = this.client.messages.stream({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options?.temperature,
      stop_sequences: options?.stopSequences,
      system,
      messages: anthropicMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
