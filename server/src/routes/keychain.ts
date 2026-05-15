/**
 * Keychain routes — REST endpoints over the OS credential store.
 *
 * Routes:
 *   PUT    /api/keychain/:provider  — store value (body: { value })
 *   GET    /api/keychain/:provider  — `{ present: boolean }` (never returns the value)
 *   DELETE /api/keychain/:provider  — `{ removed: boolean }`
 *
 * The GET endpoint deliberately does NOT return the secret to the client.
 * Server-side code reads via `getApiKey()` at request time; the browser
 * only learns whether a key is configured.
 */

import type { FastifyInstance } from "fastify";
import { setApiKey, getApiKey, deleteApiKey } from "../keychain.js";

interface KeychainParams {
  provider: string;
}

interface KeychainBody {
  value: string;
}

export function registerKeychainRoutes(server: FastifyInstance): void {
  server.put<{ Params: KeychainParams; Body: KeychainBody }>(
    "/api/keychain/:provider",
    async (req, reply) => {
      const { provider } = req.params;
      const value = req.body?.value;
      if (typeof value !== "string" || value.length === 0) {
        return reply
          .code(400)
          .send({ error: "value is required and must be a non-empty string" });
      }
      await setApiKey(provider, value);
      return reply.code(204).send();
    },
  );

  server.get<{ Params: KeychainParams }>(
    "/api/keychain/:provider",
    async (req) => {
      const value = await getApiKey(req.params.provider);
      return { present: value !== null };
    },
  );

  server.delete<{ Params: KeychainParams }>(
    "/api/keychain/:provider",
    async (req) => {
      const removed = await deleteApiKey(req.params.provider);
      return { removed };
    },
  );
}
