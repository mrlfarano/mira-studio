/**
 * Auto-discovery — scans project files for hints of MCP-compatible
 * services and returns suggestions the user can one-click connect.
 */

import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpSuggestion {
  service: string;
  detected_from: string;
  suggested_mcp_server: string;
  command: string;
  args: string[];
}

// ---------------------------------------------------------------------------
// Known service → MCP server mapping
// ---------------------------------------------------------------------------

const KNOWN_SERVICES: Record<
  string,
  { mcp_server: string; command: string; args: string[] }
> = {
  postgres: {
    mcp_server: "@modelcontextprotocol/server-postgres",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
  },
  redis: {
    mcp_server: "@modelcontextprotocol/server-redis",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-redis"],
  },
  sqlite: {
    mcp_server: "@modelcontextprotocol/server-sqlite",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite"],
  },
  github: {
    mcp_server: "@modelcontextprotocol/server-github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
  },
  slack: {
    mcp_server: "@modelcontextprotocol/server-slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
  },
  filesystem: {
    mcp_server: "@modelcontextprotocol/server-filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
  },
};

// ---------------------------------------------------------------------------
// Scanning helpers
// ---------------------------------------------------------------------------

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function scanDockerCompose(
  projectRoot: string,
): Promise<McpSuggestion[]> {
  const suggestions: McpSuggestion[] = [];
  const composePath = path.join(projectRoot, "docker-compose.yml");
  if (!(await fileExists(composePath))) return suggestions;

  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const doc = yaml.load(raw) as Record<string, unknown> | undefined;
    const services = (doc as Record<string, unknown>)?.services;
    if (services && typeof services === "object") {
      for (const svcName of Object.keys(services as Record<string, unknown>)) {
        const key = svcName.toLowerCase();
        for (const [known, info] of Object.entries(KNOWN_SERVICES)) {
          if (key.includes(known)) {
            suggestions.push({
              service: svcName,
              detected_from: "docker-compose.yml",
              suggested_mcp_server: info.mcp_server,
              command: info.command,
              args: info.args,
            });
          }
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return suggestions;
}

async function scanEnvFile(projectRoot: string): Promise<McpSuggestion[]> {
  const suggestions: McpSuggestion[] = [];
  const envPath = path.join(projectRoot, ".env");
  if (!(await fileExists(envPath))) return suggestions;

  try {
    const raw = await fs.readFile(envPath, "utf-8");
    const lower = raw.toLowerCase();

    const envHints: Record<string, string> = {
      database_url: "postgres",
      postgres: "postgres",
      redis_url: "redis",
      github_token: "github",
      slack_token: "slack",
    };

    for (const [hint, svc] of Object.entries(envHints)) {
      if (lower.includes(hint)) {
        const info = KNOWN_SERVICES[svc];
        if (info) {
          suggestions.push({
            service: svc,
            detected_from: ".env",
            suggested_mcp_server: info.mcp_server,
            command: info.command,
            args: info.args,
          });
        }
      }
    }
  } catch {
    // ignore
  }
  return suggestions;
}

async function scanPackageJson(projectRoot: string): Promise<McpSuggestion[]> {
  const suggestions: McpSuggestion[] = [];
  const pkgPath = path.join(projectRoot, "package.json");
  if (!(await fileExists(pkgPath))) return suggestions;

  try {
    const raw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const allDeps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };

    const depHints: Record<string, string> = {
      pg: "postgres",
      "pg-promise": "postgres",
      redis: "redis",
      ioredis: "redis",
      "better-sqlite3": "sqlite",
      "@octokit/rest": "github",
      "@slack/web-api": "slack",
    };

    for (const dep of Object.keys(allDeps)) {
      const svc = depHints[dep];
      if (svc) {
        const info = KNOWN_SERVICES[svc];
        if (info) {
          suggestions.push({
            service: svc,
            detected_from: "package.json",
            suggested_mcp_server: info.mcp_server,
            command: info.command,
            args: info.args,
          });
        }
      }
    }
  } catch {
    // ignore
  }
  return suggestions;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function discoverMcpServices(
  projectRoot: string,
): Promise<McpSuggestion[]> {
  const [docker, env, pkg] = await Promise.all([
    scanDockerCompose(projectRoot),
    scanEnvFile(projectRoot),
    scanPackageJson(projectRoot),
  ]);

  // De-duplicate by suggested_mcp_server
  const seen = new Set<string>();
  const results: McpSuggestion[] = [];
  for (const s of [...docker, ...env, ...pkg]) {
    if (!seen.has(s.suggested_mcp_server)) {
      seen.add(s.suggested_mcp_server);
      results.push(s);
    }
  }
  return results;
}
