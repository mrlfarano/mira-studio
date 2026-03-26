# Contributing to Mira Studio

This document defines the engineering standards for Mira Studio. Every contributor — human or AI — follows these rules. No exceptions.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [TypeScript Conventions](#typescript-conventions)
- [React Conventions](#react-conventions)
- [Server Conventions](#server-conventions)
- [State Management](#state-management)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Architecture Rules](#architecture-rules)

---

## Development Setup

```bash
npm install --legacy-peer-deps
npm --prefix server install
cp .env.example .env  # Add your API keys
```

Run both processes:

```bash
npm run server   # Terminal 1
npm run dev      # Terminal 2
```

Verify everything works:

```bash
npm run lint && npm run test && npm run test:server
```

---

## Code Standards

### Formatting

Enforced by Prettier. Non-negotiable.

| Rule | Value |
|------|-------|
| Quotes | Single |
| Semicolons | None |
| Tab width | 2 spaces |
| Trailing commas | All |

Run `npm run format` before committing, or configure your editor to format on save.

### Linting

ESLint flat config with TypeScript and React rules. `npm run lint` must pass with zero errors and zero warnings before any PR merges.

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `KanbanCard.tsx` |
| Hooks | camelCase, `use` prefix | `useTerminalSocket.ts` |
| Stores | kebab-case, `-store` suffix | `kanban-store.ts` |
| Types | kebab-case | `ws-protocol.ts` |
| Server modules | kebab-case | `pty-manager.ts` |
| Tests | Same name + `.test` suffix | `stores.test.ts` |

### Imports

Use path aliases in frontend code. Never use relative paths that cross module boundaries.

```typescript
// Good
import { useLayoutStore } from '@/store/layout-store'
import type { PanelConfig } from '@/types/panel'

// Bad
import { useLayoutStore } from '../../store/layout-store'
```

Available aliases: `@/components`, `@/lib`, `@/hooks`, `@/store`, `@/types`, `@/panels`

### Exports

- Components: default export from the component file.
- Stores, hooks, utilities: named exports.
- Barrel files (`index.ts`) only in `panels/` subdirectories. Don't create barrel files elsewhere without reason.

---

## TypeScript Conventions

### Strict Mode

Both `tsconfig.app.json` (frontend) and `server/tsconfig.json` enforce strict mode. This includes:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

Do not weaken these settings.

### Types

- Prefer `interface` for object shapes that will be extended. Use `type` for unions, intersections, and utility types.
- Export types from `src/types/` for shared types. Co-locate types that are only used by a single module.
- Use `import type` for type-only imports. The frontend tsconfig enforces `verbatimModuleSyntax`.

```typescript
// Good
import type { PanelConfig } from '@/types/panel'

// Bad
import { PanelConfig } from '@/types/panel'
```

### No `any`

Don't use `any`. Use `unknown` and narrow with type guards. The only acceptable `any` is in test mocks where the type isn't relevant to the test.

### No Non-Null Assertions

Don't use `!` non-null assertions. Handle the null case or use early returns.

---

## React Conventions

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react'
import { useLayoutStore } from '@/store/layout-store'
import type { PanelConfig } from '@/types/panel'

// 2. Types (if component-specific)
interface Props {
  panel: PanelConfig
}

// 3. Component
function PanelHeader({ panel }: Props) {
  // hooks first
  const [expanded, setExpanded] = useState(false)
  const removePanel = useLayoutStore((s) => s.removePanel)

  // handlers
  const handleClose = () => removePanel(panel.id)

  // render
  return (/* ... */)
}

export default PanelHeader
```

### Hooks

- Extract logic into custom hooks when it's reused or when a component exceeds ~100 lines of hook logic.
- Hooks live in `src/hooks/` (global) or co-located with their panel (e.g., `src/panels/terminal/useTerminal.ts`).
- Always return cleanup functions from effects that set up subscriptions or timers.

### Performance

- Use Zustand selectors to subscribe to specific slices. Never subscribe to the entire store.

```typescript
// Good — only re-renders when panels change
const panels = useLayoutStore((s) => s.panels)

// Bad — re-renders on any store change
const store = useLayoutStore()
```

- Don't wrap everything in `useMemo`/`useCallback`. Only optimize when you've identified an actual re-render problem.

---

## Server Conventions

### Module Structure

Each domain lives in its own directory under `server/src/`:

```
server/src/pty/
  index.ts          # registerPtyRoutes() — Fastify route registration
  pty-manager.ts    # Core business logic
  pty-protocol.ts   # Types/protocols for this module
  status-detector.ts
  status-detector.test.ts  # Co-located tests are fine
```

Every module exports a `register*Routes(server, ...deps)` function that the main `index.ts` calls at startup. Don't add routes outside this pattern.

### Error Handling

- Routes return proper HTTP status codes. Don't swallow errors.
- Use Fastify's built-in error handling. Don't write custom error middleware.
- Log errors with `server.log.error()`, not `console.error()`.

### No Direct File I/O from Routes

Routes delegate to engine classes. The Config Engine reads/writes `.mira/` files — routes don't touch the filesystem directly.

---

## State Management

### Zustand Stores

Each store is a single file in `src/store/`. A store owns one domain:

| Store | Domain |
|-------|--------|
| `layout-store` | Panel positions, sizes, z-index |
| `config-store` | Core `.mira/config.yml` state |
| `toggle-store` | Module toggle states per workspace |
| `session-store` | Terminal sessions and agent status |
| `companion-store` | Companion personality and chat state |
| `kanban-store` | Kanban cards and columns |
| `scene-store` | Workspace scenes |
| `onboarding-store` | Wizard progress |
| `notification-store` | Notification queue |
| `command-store` | Command palette commands |
| `theme-store` | Active theme and overrides |
| `si-store` | Self-improvement state |
| `connection-store` | WebSocket connection state |

### Config Sync Flow

This is the most important data flow in the app:

1. On boot, `hydrateStores()` GETs server config and populates all stores.
2. `startConfigSync()` subscribes to store changes.
3. On change, config-sync middleware debounces (300ms) and PUTs to the server.
4. Server writes `.mira/*.yml` and returns the canonical state.
5. On conflict, **server wins** — the client reverts.

Don't bypass this flow. Don't write directly to `.mira/` from the frontend.

### Adding a New Store

1. Create `src/store/{name}-store.ts`
2. Add hydration logic in `src/store/hydrate.ts` if it persists to server
3. Add sync subscription in `src/store/middleware/config-sync.ts` if it auto-saves
4. Add selectors in `src/store/selectors.ts` if shared across multiple components

---

## Testing

### Requirements

- All new server modules must have unit tests.
- All Zustand stores must have tests covering core actions.
- Bug fixes must include a regression test.

### Structure

| Test type | Location | Runner |
|-----------|----------|--------|
| Frontend unit | `src/__tests__/` or co-located `.test.tsx` | Vitest + jsdom |
| Server unit | `server/src/__tests__/` or co-located `.test.ts` | Vitest |
| E2E | `e2e/` | Playwright |

### Running Tests

```bash
npm run test                           # All frontend tests
npm run test:server                    # All server tests
npx vitest run src/__tests__/stores.test.ts  # Single frontend file
npm run test:e2e                       # E2E (starts both servers)
```

### Test Conventions

- Use `describe` blocks to group by feature, not by function name.
- Test behavior, not implementation. Don't test that a specific private method was called.
- Use Testing Library queries (`getByRole`, `getByText`) over `querySelector`.
- In server tests, mock external dependencies (filesystem, network) but test the actual logic.

---

## Git Workflow

### Branch Naming

```
feature/short-description
fix/issue-description
refactor/what-changed
chore/maintenance-task
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add workspace scene switcher
fix: terminal resize not propagating to PTY
refactor: extract config sync into middleware
test: add status detector unit tests
chore: update dependencies
docs: update contributing guide
```

**Rules:**

- Lowercase first word after the type prefix.
- No period at the end.
- Subject line under 72 characters.
- Body is optional but encouraged for non-trivial changes. Explain *why*, not *what*.

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Public-facing breaking changes.
- **MINOR** (0.x.0): New features, backward-compatible.
- **PATCH** (0.0.x): Bug fixes.

We are pre-1.0. The API and config format may change between minor versions.

### Tags and Releases

Every version bump gets a Git tag (`v0.1.0`) and a GitHub Release with notes pulled from `CHANGELOG.md`. The changelog follows [Keep a Changelog](https://keepachangelog.com/).

---

## Pull Request Process

1. Branch off `main`. Keep branches short-lived.
2. Ensure `npm run lint`, `npm run test`, and `npm run test:server` all pass.
3. Write a clear PR description: what changed, why, and how to test it.
4. One approval required to merge.
5. Squash merge to `main`. The squash commit message follows Conventional Commits.
6. Delete the branch after merge.

### PR Checklist

- [ ] Lint passes (`npm run lint`)
- [ ] Frontend tests pass (`npm run test`)
- [ ] Server tests pass (`npm run test:server`)
- [ ] New features have tests
- [ ] No `any` types introduced
- [ ] No `console.log` left in production code (use `server.log` on server side)
- [ ] CHANGELOG.md updated for user-facing changes

---

## Architecture Rules

These are non-negotiable constraints that define Mira Studio's identity.

### SI Safety Model

The Self-Improvement agent:
- Writes only to `mira/si-YYYY-MM-DD-[description]` branches
- Can open PRs but **cannot merge**
- No bypass at any configuration level

### MCP Principle

- No JSON editing for MCP connections, ever
- Credentials go to system keychain, never `.mira/`
- All connection flows are conversational through the Mira companion

### Config Layering

- **Portable** (Git-committed): layouts, toggles, skills, themes
- **Personal** (gitignored): `memory.yml`, `user_SI.yml`, session history
- Secrets never in `.mira/`. Always system keychain.

### Two-Process Boundary

- Frontend never spawns processes or touches the filesystem
- Server never renders UI or manages DOM state
- All communication is REST, WebSocket, or SSE — no shared memory

### Target Platforms

macOS, Windows, and Linux. No mobile. v1 runs as browser + local server. v2 wraps in Tauri (sidecar model — Tauri launches the Fastify server as a bundled process).
