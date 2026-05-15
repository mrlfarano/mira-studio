import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { registerScenesRoute } from "../scenes.js";

describe("GET /api/config/scenes", () => {
  it("returns empty scenes array when scenes.yml missing", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-scenes-"));
    mkdirSync(path.join(tmp, ".mira"));
    const app = Fastify();
    registerScenesRoute(app, tmp);
    const res = await app.inject({
      method: "GET",
      url: "/api/config/scenes",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ scenes: [] });
    await app.close();
  });

  it("returns parsed scenes when scenes.yml exists", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-scenes-"));
    mkdirSync(path.join(tmp, ".mira"));
    const yaml = `scenes:
  - id: focus
    name: Focus
    workspaces:
      - default
      - secondary
`;
    writeFileSync(path.join(tmp, ".mira", "scenes.yml"), yaml, "utf8");
    const app = Fastify();
    registerScenesRoute(app, tmp);
    const res = await app.inject({
      method: "GET",
      url: "/api/config/scenes",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      scenes: [
        {
          id: "focus",
          name: "Focus",
          workspaces: ["default", "secondary"],
        },
      ],
    });
    await app.close();
  });

  it("returns empty scenes when scenes.yml has null content", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-scenes-"));
    mkdirSync(path.join(tmp, ".mira"));
    writeFileSync(path.join(tmp, ".mira", "scenes.yml"), "", "utf8");
    const app = Fastify();
    registerScenesRoute(app, tmp);
    const res = await app.inject({
      method: "GET",
      url: "/api/config/scenes",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ scenes: [] });
    await app.close();
  });
});
