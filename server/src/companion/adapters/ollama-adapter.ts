/**
 * OllamaAdapter — LLM adapter for locally-running Ollama models.
 *
 * Streams chat completions via the Ollama HTTP API at localhost:11434.
 */

import type {
  LLMAdapter,
  LLMAdapterOptions,
  CompanionMessage,
} from "../types.js";

const DEFAULT_MODEL = "llama3";
const DEFAULT_BASE_URL = "http://localhost:11434";

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: true;
  options?: {
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaStreamChunk {
  message?: { content: string };
  done: boolean;
}

export class OllamaAdapter implements LLMAdapter {
  readonly name = "ollama";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
  }

  async *chat(
    messages: CompanionMessage[],
    options?: LLMAdapterOptions,
  ): AsyncGenerator<string> {
    const body: OllamaChatRequest = {
      model: options?.model ?? DEFAULT_MODEL,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      options: {
        temperature: options?.temperature,
        num_predict: options?.maxTokens,
        stop: options?.stopSequences,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${text}`,
      );
    }

    if (!response.body) {
      throw new Error("Ollama returned no response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Ollama sends newline-delimited JSON
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk = JSON.parse(trimmed) as OllamaStreamChunk;
          if (chunk.message?.content) {
            yield chunk.message.content;
          }
          if (chunk.done) return;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}
