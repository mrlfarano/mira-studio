/**
 * Companion routes — Fastify plugin that registers REST/SSE endpoints
 * for the Mira Companion AI chat engine.
 *
 * Routes:
 *   POST /api/companion/chat           — SSE streaming chat endpoint
 *   GET  /api/companion/context        — current session context
 *   POST /api/companion/generate-cards — brain-dump to structured Kanban cards
 */

import type { FastifyInstance } from "fastify";
import type { ConfigEngine } from "../config/config-engine.js";
import type { CompanionConfig } from "../config/types.js";
import type { CompanionContext, LLMAdapter } from "./types.js";
import { CompanionEngine } from "./companion-engine.js";
import { ClaudeAdapter } from "./adapters/claude-adapter.js";
import { OllamaAdapter } from "./adapters/ollama-adapter.js";
import { generateCardsFromText } from "./card-generator.js";

export { CompanionEngine } from "./companion-engine.js";
export { ClaudeAdapter } from "./adapters/claude-adapter.js";
export { OllamaAdapter } from "./adapters/ollama-adapter.js";
export type * from "./types.js";

// ---------------------------------------------------------------------------
// Request / response schemas
// ---------------------------------------------------------------------------

interface ChatBody {
  message: string;
  sessionId?: string;
  context?: CompanionContext;
  /** Override adapter: "claude" | "ollama" */
  provider?: string;
  model?: string;
}

interface ContextQuery {
  sessionId: string;
}

interface GenerateCardsBody {
  text: string;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

/**
 * Initialise the CompanionEngine and register companion routes.
 * Call once during server bootstrap.
 */
export async function registerCompanionRoutes(
  server: FastifyInstance,
  projectRoot: string,
  configEngine: ConfigEngine,
): Promise<CompanionEngine> {
  // Load companion config
  let companionConfig: CompanionConfig;
  try {
    companionConfig = await configEngine.loadConfig<CompanionConfig>(
      "companion.yml",
    );
  } catch {
    companionConfig = {
      name: "Mira",
      tone: "Casual",
      verbosity: 3,
      notifications: { agentFinish: true, agentError: true, nudges: true },
      memory: { enabled: true, maxEntries: 500 },
      vibeScoreEnabled: true,
    };
  }

  // Select default adapter based on environment
  const defaultAdapter: LLMAdapter = process.env.ANTHROPIC_API_KEY
    ? new ClaudeAdapter()
    : new OllamaAdapter();

  const engine = new CompanionEngine(defaultAdapter, companionConfig);

  // Reload personality when companion.yml changes
  configEngine.on("config:changed", async ({ filePath }) => {
    if (filePath.endsWith("companion.yml")) {
      try {
        const updated =
          await configEngine.loadConfig<CompanionConfig>("companion.yml");
        engine.updateConfig(updated);
        server.log.info("Companion config reloaded");
      } catch (err) {
        server.log.error(err, "Failed to reload companion config");
      }
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/companion/chat — SSE streaming
  // -------------------------------------------------------------------------

  server.post<{ Body: ChatBody }>(
    "/api/companion/chat",
    async (request, reply) => {
      const { message, sessionId, context, provider, model } = request.body;

      if (!message || typeof message !== "string") {
        return reply.status(400).send({ error: "message is required" });
      }

      // Allow per-request adapter override
      let adapter: LLMAdapter | undefined;
      if (provider === "claude") {
        adapter = new ClaudeAdapter();
      } else if (provider === "ollama") {
        adapter = new OllamaAdapter();
      }
      if (adapter) {
        engine.setAdapter(adapter);
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      try {
        const stream = engine.chat(
          message,
          context ?? {},
          sessionId,
          model ? { model } : undefined,
        );

        for await (const chunk of stream) {
          reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        // Send completion event
        const session = engine.getSession(sessionId);
        reply.raw.write(
          `data: ${JSON.stringify({ done: true, sessionId: session.id, actions: session.pendingActions })}\n\n`,
        );
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        server.log.error(err, "Companion chat error");
        reply.raw.write(
          `data: ${JSON.stringify({ error: errorMsg })}\n\n`,
        );
      } finally {
        reply.raw.end();
      }
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/companion/context — session context
  // -------------------------------------------------------------------------

  server.get<{ Querystring: ContextQuery }>(
    "/api/companion/context",
    async (request, reply) => {
      const sessionId = (request.query as ContextQuery).sessionId;
      if (!sessionId) {
        return reply
          .status(400)
          .send({ error: "sessionId query parameter is required" });
      }

      const ctx = engine.getContext(sessionId);
      return { sessionId, context: ctx };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/companion/generate-cards — brain-dump to Kanban cards
  // -------------------------------------------------------------------------

  server.post<{ Body: GenerateCardsBody }>(
    "/api/companion/generate-cards",
    async (request, reply) => {
      const { text } = request.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return reply
          .status(400)
          .send({ error: "text is required and must be a non-empty string" });
      }

      try {
        const result = await generateCardsFromText(engine, text);
        return { cards: result.cards };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        server.log.error(err, "Card generation error");
        return reply.status(500).send({ error: errorMsg });
      }
    },
  );

  return engine;
}
