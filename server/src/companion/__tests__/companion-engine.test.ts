/**
 * CompanionEngine — memory.yml integration tests
 *
 * These tests verify that .mira/memory.yml is read server-side and injected
 * into the system prompt, with graceful handling of a missing file.
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { CompanionEngine } from "../companion-engine.js";
import type { LLMAdapter, CompanionMessage } from "../types.js";

// ---------------------------------------------------------------------------
// Minimal stub adapter — never called by buildSystemPrompt
// ---------------------------------------------------------------------------

const stubAdapter: LLMAdapter = {
  name: "stub",
  async *chat(_messages: CompanionMessage[]) {
    yield "stub response";
  },
};

const baseConfig = {
  name: "Mira",
  tone: "Casual" as const,
  verbosity: 3,
  notifications: { agentFinish: true, agentError: true, nudges: true },
  memory: { enabled: true, maxEntries: 500 },
  vibeScoreEnabled: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CompanionEngine — memory.yml integration", () => {
  it("includes memory.yml content in system prompt when present", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-test-"));
    mkdirSync(path.join(tmp, ".mira"));
    writeFileSync(
      path.join(tmp, ".mira", "memory.yml"),
      'project_notes: "User prefers terse explanations."\n',
    );

    const engine = new CompanionEngine(stubAdapter, baseConfig, tmp);
    const prompt = await engine.buildSystemPrompt({});

    expect(prompt).toMatch(/terse explanations/);
    expect(prompt).toMatch(/Project memory/);
  });

  it("omits memory section when memory.yml is missing", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-test-"));
    mkdirSync(path.join(tmp, ".mira"));

    const engine = new CompanionEngine(stubAdapter, baseConfig, tmp);
    const prompt = await engine.buildSystemPrompt({});

    expect(prompt).not.toMatch(/Project memory/);
  });

  it("omits memory section when projectRoot is not provided", async () => {
    const engine = new CompanionEngine(stubAdapter, baseConfig);
    const prompt = await engine.buildSystemPrompt({});

    expect(prompt).not.toMatch(/Project memory/);
  });

  it("handles a memory.yml with invalid YAML gracefully", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-test-"));
    mkdirSync(path.join(tmp, ".mira"));
    writeFileSync(
      path.join(tmp, ".mira", "memory.yml"),
      ":\n  bad: [yaml\n",
    );

    const engine = new CompanionEngine(stubAdapter, baseConfig, tmp);
    // Should not throw
    const prompt = await engine.buildSystemPrompt({});
    expect(typeof prompt).toBe("string");
  });

  it("still includes workspace context alongside memory", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "mira-test-"));
    mkdirSync(path.join(tmp, ".mira"));
    writeFileSync(
      path.join(tmp, ".mira", "memory.yml"),
      "project_notes: remember-this\n",
    );

    const engine = new CompanionEngine(stubAdapter, baseConfig, tmp);
    const prompt = await engine.buildSystemPrompt({
      workspace: "my-workspace",
      gitBranch: "feature/x",
    });

    expect(prompt).toMatch(/remember-this/);
    expect(prompt).toMatch(/my-workspace/);
    expect(prompt).toMatch(/feature\/x/);
  });
});
