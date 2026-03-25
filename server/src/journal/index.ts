/**
 * Journal routes -- Fastify plugin that registers REST endpoints for build journals.
 *
 * Routes:
 *   GET  /api/journal        -- list journal files (dates)
 *   GET  /api/journal/today  -- current day's entries
 *   GET  /api/journal/:date  -- get specific day's journal
 *   POST /api/journal/summary -- generate daily summary (optionally for a given date)
 */

import type { FastifyInstance } from "fastify";
import { JournalEngine } from "./journal-engine.js";
import type { PtyManager } from "../pty/pty-manager.js";
import type { ConfigEngine } from "../config/config-engine.js";

export { JournalEngine } from "./journal-engine.js";
export type { JournalEntry } from "./journal-engine.js";

/**
 * Initialise the JournalEngine and register all journal routes.
 * Call once during server bootstrap.
 */
export async function registerJournalRoutes(
  server: FastifyInstance,
  projectRoot: string,
  ptyManager: PtyManager,
  configEngine: ConfigEngine,
): Promise<JournalEngine> {
  const engine = new JournalEngine(projectRoot);
  await engine.init(ptyManager, configEngine);

  // Forward journal events to Fastify logger
  engine.on("entry", (entry) => {
    server.log.info(`Journal: [${entry.timestamp}] [${entry.source}] ${entry.description}`);
  });
  engine.on("error", (err) => {
    server.log.error(err, "JournalEngine error");
  });

  // Log that journal engine started
  await engine.addEntry("system", "Build journal engine initialised");

  // -------------------------------------------------------------------------
  // GET /api/journal -- list journal files
  // -------------------------------------------------------------------------
  server.get("/api/journal", async () => {
    const dates = await engine.listJournalDates();
    return { journals: dates };
  });

  // -------------------------------------------------------------------------
  // GET /api/journal/today -- current day's entries
  // -------------------------------------------------------------------------
  server.get("/api/journal/today", async () => {
    const entries = engine.getTodayEntries();
    return { date: new Date().toISOString().slice(0, 10), entries };
  });

  // -------------------------------------------------------------------------
  // GET /api/journal/:date -- get specific day's journal
  // -------------------------------------------------------------------------
  server.get<{ Params: { date: string } }>(
    "/api/journal/:date",
    async (req, reply) => {
      const { date } = req.params;

      // Validate date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: "Invalid date format. Use YYYY-MM-DD." });
      }

      const content = await engine.getJournalByDate(date);
      if (content === null) {
        return reply.status(404).send({ error: `No journal found for ${date}` });
      }

      const entries = engine.parseJournalContent(content);
      return { date, entries, raw: content };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/journal/summary -- generate daily summary
  // -------------------------------------------------------------------------
  server.post<{ Body?: { date?: string } }>(
    "/api/journal/summary",
    async (req) => {
      const date = req.body?.date;
      const summary = await engine.generateDailySummary(date ?? undefined);
      return { date: date ?? new Date().toISOString().slice(0, 10), summary };
    },
  );

  return engine;
}
