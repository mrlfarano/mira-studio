# Mira Studio Codex Guidance

## Project Shape

Mira Studio is a local-first vibe coding cockpit for solo developers. It is not an IDE; it layers terminals, planning tools, Kanban, build journal, companion AI, skills, and MCP workflows over existing developer tools.

The app has two processes:

- Frontend: React, Vite, TypeScript, Zustand, `react-grid-layout`, `xterm.js`.
- Server: Fastify TypeScript server with modules for PTY, config, git, MCP, companion, skills, journal, snapshot, SI, and related APIs.

Portable project config lives in `.mira/`; personal memory and secrets stay out of git.

## Commands

```bash
npm install --legacy-peer-deps
npm --prefix server install
npm run dev
npm run server
npm run build
npm run server:build
npm run lint
npm run format
npm run test
npm run test:server
npm run test:e2e
```

Single-test examples:

```bash
npx vitest run src/__tests__/stores.test.ts
npx vitest run --config server/vitest.config.ts server/src/__tests__/health.test.ts
```

## Rules

- Keep the Vite frontend and Fastify server as separate processes.
- Preserve the `.mira/` two-layer model: committed portable config versus gitignored personal memory/secrets.
- Do not add a file manager or code editor surface unless explicitly requested.
- SI automation must write only to `mira/si-YYYY-MM-DD-*` branches, can open PRs, and must never merge.
- MCP connection flows should stay conversational through Mira; do not hand-edit credential JSON.
- Skills must use declared permissions and Mira primitives.
- Use `--legacy-peer-deps` for frontend installs.
