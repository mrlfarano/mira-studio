/**
 * Scenes route — reads workspace scenes from `.mira/scenes.yml`.
 *
 * Route:
 *   GET /api/config/scenes — returns `{ scenes: WorkspaceScene[] }`
 *
 * If `scenes.yml` is missing or empty, returns `{ scenes: [] }`.
 * The client falls back to defaults from `scene-store.ts` when the
 * server returns an empty list.
 */

import type { FastifyInstance } from "fastify";
import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

interface ScenesFile {
  scenes: Array<{
    id: string;
    name: string;
    workspaces: [string, string] | string[];
  }>;
}

export function registerScenesRoute(
  server: FastifyInstance,
  projectRoot: string,
): void {
  server.get("/api/config/scenes", async () => {
    try {
      const raw = await readFile(
        path.join(projectRoot, ".mira", "scenes.yml"),
        "utf8",
      );
      const parsed = yaml.load(raw) as ScenesFile | null;
      if (!parsed || !Array.isArray(parsed.scenes)) {
        return { scenes: [] };
      }
      return parsed;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { scenes: [] };
      }
      throw err;
    }
  });
}
