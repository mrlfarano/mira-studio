/**
 * Permission check middleware for the skill system.
 *
 * Skills declare which Mira primitives they access via `permissions[]` in their
 * manifest. This module provides a Fastify preHandler hook that verifies a skill
 * has declared the required permission before it can access a primitive.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { SkillStore } from "./skill-store.js";
import type { SkillRuntime } from "./skill-runtime.js";
import type { SkillPermission } from "./types.js";

export interface PermissionCheckOptions {
  skillStore: SkillStore;
  skillRuntime: SkillRuntime;
}

/**
 * Creates a Fastify preHandler that checks whether the skill identified
 * by the `x-mira-skill` request header (or `skillId` query param) has
 * the required permission to access the route's primitive.
 *
 * Usage in route registration:
 *   server.get("/api/some-primitive", {
 *     preHandler: requireSkillPermission(opts, "panels"),
 *   }, handler);
 */
export function requireSkillPermission(
  opts: PermissionCheckOptions,
  requiredPermission: SkillPermission,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract skill ID from header or query parameter
    const skillId =
      (request.headers["x-mira-skill"] as string | undefined) ??
      (request.query as Record<string, string>)?.skillId;

    // If no skill ID is present, this is a direct user request — allow it
    if (!skillId) return;

    // Look up the skill's entry in the store
    const entry = await opts.skillStore.getById(skillId);
    if (!entry) {
      return reply.status(403).send({
        error: `Skill "${skillId}" is not installed`,
      });
    }

    if (!entry.enabled) {
      return reply.status(403).send({
        error: `Skill "${skillId}" is disabled`,
      });
    }

    // Check declared permissions
    if (!entry.permissions.includes(requiredPermission)) {
      return reply.status(403).send({
        error: `Skill "${skillId}" does not have "${requiredPermission}" permission`,
      });
    }

    // Permission granted — continue
  };
}

/**
 * Validate that a manifest's permissions list only contains valid primitives.
 * Returns an array of invalid permission strings (empty if all valid).
 */
export function findInvalidPermissions(permissions: string[]): string[] {
  const valid: Set<string> = new Set([
    "panels",
    "kanban",
    "journal",
    "agent_context",
    "build_journal",
    "companion",
    "config",
    "workspace",
  ]);

  return permissions.filter((p) => !valid.has(p));
}
