/**
 * Config routes — Fastify plugin that registers REST endpoints for .mira/ CRUD.
 *
 * Routes:
 *   GET  /api/config              — full MiraConfig
 *   PUT  /api/config              — update MiraConfig
 *   GET  /api/config/companion    — CompanionConfig
 *   PUT  /api/config/companion    — update CompanionConfig
 *   GET  /api/config/workspaces   — list workspace configs
 *   GET  /api/config/workspaces/:name — single workspace
 *   PUT  /api/config/workspaces/:name — update workspace
 *   GET  /api/themes              — list user themes from .mira/themes/
 *   PUT  /api/themes/:name        — create or update a theme
 */

import path from "node:path";
import fs from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { ConfigEngine } from "./config-engine.js";
import type {
  MiraConfig,
  CompanionConfig,
  WorkspaceConfig,
} from "./types.js";

export { ConfigEngine } from "./config-engine.js";
export type * from "./types.js";

/**
 * Initialise the ConfigEngine and register all config routes.
 * Call once during server bootstrap.
 */
export async function registerConfigRoutes(
  server: FastifyInstance,
  projectRoot: string,
): Promise<ConfigEngine> {
  const engine = new ConfigEngine(projectRoot);

  // Scaffold .mira/ with defaults if needed
  await engine.ensureConfigDir();

  // Start file watcher
  engine.startWatching();

  // Forward watcher events to Fastify logger
  engine.on("config:changed", ({ filePath }) => {
    server.log.info(`Config changed externally: ${filePath}`);
  });
  engine.on("error", (err) => {
    server.log.error(err, "ConfigEngine error");
  });

  // Clean up on server close
  server.addHook("onClose", async () => {
    await engine.stop();
  });

  // -----------------------------------------------------------------------
  // MiraConfig (config.yml)
  // -----------------------------------------------------------------------

  server.get("/api/config", async () => {
    return engine.loadConfig<MiraConfig>("config.yml");
  });

  server.put<{ Body: Partial<MiraConfig> }>("/api/config", async (req) => {
    const current = await engine.loadConfig<MiraConfig>("config.yml");
    const updated: MiraConfig = { ...current, ...req.body };
    engine.saveConfigDebounced("config.yml", updated);
    return updated;
  });

  // -----------------------------------------------------------------------
  // CompanionConfig (companion.yml)
  // -----------------------------------------------------------------------

  server.get("/api/config/companion", async () => {
    return engine.loadConfig<CompanionConfig>("companion.yml");
  });

  server.put<{ Body: Partial<CompanionConfig> }>(
    "/api/config/companion",
    async (req) => {
      const current = await engine.loadConfig<CompanionConfig>(
        "companion.yml",
      );
      const updated: CompanionConfig = { ...current, ...req.body };
      engine.saveConfigDebounced("companion.yml", updated);
      return updated;
    },
  );

  // -----------------------------------------------------------------------
  // Workspaces (workspaces/*.yml)
  // -----------------------------------------------------------------------

  server.get("/api/config/workspaces", async () => {
    const wsDir = path.join(engine.getConfigDir(), "workspaces");
    try {
      const files = await fs.readdir(wsDir);
      const ymls = files.filter(
        (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
      );

      const workspaces: WorkspaceConfig[] = await Promise.all(
        ymls.map((f) =>
          engine.loadConfig<WorkspaceConfig>(path.join("workspaces", f)),
        ),
      );
      return workspaces;
    } catch {
      return [];
    }
  });

  server.get<{ Params: { name: string } }>(
    "/api/config/workspaces/:name",
    async (req, reply) => {
      const { name } = req.params;
      try {
        const ws = await engine.loadConfig<WorkspaceConfig>(
          path.join("workspaces", `${name}.yml`),
        );
        return ws;
      } catch {
        return reply.status(404).send({ error: `Workspace '${name}' not found` });
      }
    },
  );

  server.put<{ Params: { name: string }; Body: Partial<WorkspaceConfig> }>(
    "/api/config/workspaces/:name",
    async (req) => {
      const { name } = req.params;
      const filePath = path.join("workspaces", `${name}.yml`);

      let current: WorkspaceConfig;
      try {
        current = await engine.loadConfig<WorkspaceConfig>(filePath);
      } catch {
        // New workspace — start from defaults
        current = { ...({ name } as WorkspaceConfig) };
      }

      const updated: WorkspaceConfig = { ...current, ...req.body, name };
      engine.saveConfigDebounced(filePath, updated);
      return updated;
    },
  );

  // -----------------------------------------------------------------------
  // Themes (themes/*.yml)
  // -----------------------------------------------------------------------

  interface ThemeConfig {
    id: string;
    name: string;
    author: string;
    variables: Record<string, string>;
    css?: string;
  }

  server.get("/api/themes", async () => {
    const themesDir = path.join(engine.getConfigDir(), "themes");
    try {
      const files = await fs.readdir(themesDir);
      const ymls = files.filter(
        (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
      );

      const themes: ThemeConfig[] = await Promise.all(
        ymls.map((f) =>
          engine.loadConfig<ThemeConfig>(path.join("themes", f)),
        ),
      );
      return themes;
    } catch {
      return [];
    }
  });

  server.put<{ Params: { name: string }; Body: Partial<ThemeConfig> }>(
    "/api/themes/:name",
    async (req) => {
      const { name } = req.params;
      const filePath = path.join("themes", `${name}.yml`);

      let current: ThemeConfig;
      try {
        current = await engine.loadConfig<ThemeConfig>(filePath);
      } catch {
        // New theme — start from the request body
        current = {
          id: name,
          name,
          author: "User",
          variables: {},
          ...req.body,
        } as ThemeConfig;
      }

      const updated: ThemeConfig = { ...current, ...req.body, id: name };
      engine.saveConfigDebounced(filePath, updated);
      return updated;
    },
  );

  return engine;
}
