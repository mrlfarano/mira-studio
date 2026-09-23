# AGENTS.md

## Product Contract

Mira Studio is a local-first vibe coding cockpit for solo developers.

It combines AI agent terminals, planning tools, workspace configuration, and developer workflow in one customizable environment. Mira Studio sits on top of the developer's existing tools. It is not an IDE.

**Mira** is the persistent AI companion inside Mira Studio. Mira helps configure the environment, monitors agents, organizes work, and surfaces useful information without unnecessarily interrupting the developer.

### Product principles

- Remain local-first.
- Keep the developer in control.
- Store user-owned configuration in `.mira/`.
- Prefer transparent behavior over hidden automation.
- Avoid interrupting the developer's flow.
- Preserve compatibility with existing developer tools.
- Keep configuration portable through Git where appropriate.
- Do not expand Mira Studio into a full IDE unless explicitly requested.
- Do not introduce required cloud infrastructure or a remote backend without an explicit architectural decision.

## Terminology

Use these names consistently:

- **Mira Studio:** The complete application.
- **Mira:** The AI companion.
- **Agent session:** A running Claude Code, Codex, or other CLI agent process.
- **Workspace:** The active panel and tool configuration.
- **Scene:** A saved workspace configuration that can be swapped with another scene.
- **Toggle profile:** A preset controlling which modules are active.
- **Portable configuration:** `.mira/` configuration intended to be committed.
- **Personal configuration:** Machine-specific or user-specific configuration that must remain ignored by Git.

Do not introduce competing terminology for these concepts without a clear product reason.

## Instruction Precedence

When instructions conflict, follow this order:

1. Explicit task instructions
2. The nearest applicable `AGENTS.md`
3. `CONTRIBUTING.md`
4. `README.md`
5. Existing code, tests, and repository conventions

Do not silently resolve a material contradiction. Report it in the implementation summary.

## Required Toolchain

- Node.js 22 or newer
- npm 10 or newer
- npm is the repository package manager

Do not switch package managers or replace existing lockfiles unless explicitly requested.

### Installation

Install frontend dependencies with:

    npm install --legacy-peer-deps

Install server dependencies with:

    npm --prefix server install

Do not delete or regenerate lockfiles merely to bypass a dependency problem.

### Development

Start the local server:

    npm run server

Start the frontend:

    npm run dev

Default development endpoints:

- Frontend: `http://localhost:5173`
- Server: `http://127.0.0.1:3001`

Preserve the server's loopback-only binding unless remote access is an explicit requirement.

## Architecture Contract

Mira Studio uses two cooperating processes:

1. A React browser application
2. A local Fastify server

### Frontend responsibilities

The frontend owns:

- Panel rendering and layout
- Terminal presentation through xterm.js
- User interactions
- Command palette behavior
- Kanban presentation
- Companion presentation
- Client-side state through Zustand

The frontend must not directly:

- Spawn operating-system processes
- Access the system keychain
- perform Git operations
- Read or write arbitrary local files
- Connect directly to AI provider APIs when the server abstraction already owns that responsibility

Route privileged and operating-system-level operations through the local server.

### Server responsibilities

The Fastify server owns:

- `.mira/` configuration persistence
- PTY lifecycle management
- AI provider communication
- MCP connections
- Git synchronization
- Skills
- Journal generation
- Snapshots
- System-level operations

Validate all client-provided input at the server boundary.

### Communication transports

Preserve the existing transport responsibilities:

- **REST:** Request-response operations and configuration
- **WebSocket:** Interactive PTY communication
- **SSE:** Streaming Mira companion responses

Do not introduce another real-time transport or collapse these transports into one without a demonstrated architectural benefit.

When changing a protocol:

- Update the frontend and server together.
- Keep message shapes typed and validated.
- Handle malformed messages safely.
- Preserve backward compatibility when practical.
- Add tests for both sides of the boundary.

## Configuration Rules

The `.mira/` directory is part of Mira Studio's public product surface. Treat its structure and YAML schemas as stable interfaces.

### Portable and personal configuration

- Portable configuration may be committed to Git.
- Personal configuration must remain ignored by Git.
- Secrets must never be written to either configuration layer.
- Respect the existing configuration merge order.
- Do not invent another configuration layer without a clear requirement.

### Configuration persistence

Configuration changes must:

- Produce valid YAML.
- Avoid corrupting existing state.
- Avoid unnecessary rewrites or ordering churn.
- Preserve unknown fields when practical.
- Remain backward compatible or include a migration.
- Avoid write, synchronization, or auto-commit loops.
- Persist only intentional user-visible changes.

When modifying a configuration schema, update:

- Types
- Defaults
- Validation
- Serialization
- Deserialization
- Migration behavior
- Relevant documentation
- Round-trip tests

Tests involving `.mira/` must use temporary directories. Never modify the developer's real `.mira/` state during tests.

## Git Safety

Mira Studio may perform Git-backed synchronization, but it must behave as a careful guest inside the user's repository.

Automated Git behavior must:

- Scope changes to files Mira Studio owns.
- Avoid staging unrelated application code.
- Avoid modifying unrelated branches or commits.
- Avoid changing global Git configuration.
- Produce clear, narrowly scoped commit messages.
- Detect and report repository conflicts rather than overwriting work.
- Avoid creating repeated no-op commits.

Never perform the following automatically:

- Force push
- Hard reset
- Destructive clean
- History rewrite
- Rebase of user branches
- Deletion of branches or tags
- Checkout that discards uncommitted work

Tests for Git synchronization must use temporary repositories.

## Terminal and PTY Safety

Agent terminals use `node-pty` and must be treated as long-lived operating-system resources.

PTY changes must correctly handle:

- Process creation
- Input and output streaming
- Terminal resize
- Process exit
- Client disconnection
- Session cancellation
- Server shutdown
- Resource cleanup

Requirements:

- Do not leak PTY processes after a client disconnects.
- Do not concatenate untrusted values into shell commands.
- Validate working directories and path inputs.
- Use cross-platform path APIs.
- Avoid assuming a specific shell unless the feature requires one.
- Do not expose environment variables, tokens, or credentials in logs.
- Keep terminal output isolated to the correct session.
- Do not allow one session to control or observe another session accidentally.

## Mira Companion and AI Providers

Preserve the provider abstraction. Provider-specific behavior should remain inside the applicable adapter unless explicitly required elsewhere.

When working on Mira:

- Keep streaming cancellable.
- Handle partial responses and provider failures gracefully.
- Do not freeze the rest of the interface during a request.
- Send only the context required for the requested operation.
- Do not silently send broad workspace, terminal, or file contents to an external provider.
- Clearly separate system instructions, user content, and generated context.
- Avoid provider-specific UI assumptions.
- Never log API keys or authorization headers.
- Use `.env.example` as the authoritative guide for environment variables.

Unit and end-to-end tests should not require live provider credentials unless the test is explicitly designated as a live integration test.

Use mocks or deterministic fixtures for normal CI execution.

## MCP and Skill Security

MCP connections and skills may access sensitive local capabilities.

All new capabilities must follow least privilege.

Requirements:

- Validate manifests and configuration before activation.
- Require explicit permission for sensitive primitives.
- Keep credentials in the system keychain where supported.
- Never persist credentials in `.mira/`, logs, URLs, or Git.
- Do not execute code merely because a skill was discovered.
- Clearly report installation, activation, and permission failures.
- Release resources when a skill is disabled, removed, or reloaded.
- Prevent duplicate registrations during hot reload.
- Treat external MCP servers and skill manifests as untrusted input.

A skill must not gain broader access than its declared permissions.

## Frontend Conventions

Use the existing React, TypeScript, Zustand, and component patterns before introducing new ones.

### State

- Use component state for local presentation concerns.
- Use Zustand for shared state that crosses component or panel boundaries.
- Do not create multiple competing sources of truth.
- Treat server-backed `.mira/` state as durable state.
- Avoid persisting temporary UI state unless the product requires it.
- Prevent synchronization feedback loops between Zustand and the server.

### UI behavior

Preserve:

- Panel minimum-size constraints
- Z-index and focus behavior
- Drag-and-drop interaction
- Rebindable keyboard shortcuts
- Command palette conventions
- Workspace scene behavior
- Snapshot round trips
- Terminal responsiveness

Do not hard-code new keyboard shortcuts outside the existing hotkey system.

Avoid blocking dialogs when a non-blocking notification or panel state can communicate the same information.

New mandatory configuration should include sensible defaults and should not unnecessarily extend the onboarding flow.

### TypeScript

- Prefer explicit domain types at process and protocol boundaries.
- Avoid `any`.
- Narrow `unknown` values before use.
- Do not suppress TypeScript errors without documenting the reason.
- Keep shared frontend-server contracts synchronized.
- Preserve the existing TypeScript compiler configuration.

## Server Conventions

Follow existing Fastify plugin, route, service, and lifecycle patterns.

Server changes must:

- Validate route parameters, payloads, and socket messages.
- Return useful errors without leaking sensitive information.
- Clean up listeners, streams, PTYs, and provider requests.
- Avoid blocking the event loop with unnecessary synchronous work.
- Preserve graceful shutdown behavior.
- Keep local-only capabilities behind the server boundary.
- Avoid OS-specific path assumptions.

Do not expose the local server beyond `127.0.0.1` without explicit authentication and threat-modeling work.

## Dependency Rules

Before adding a dependency:

1. Check whether the repository already includes an appropriate solution.
2. Determine whether the platform or standard library can solve the problem.
3. Evaluate maintenance, bundle, security, and native-build costs.
4. Explain why the dependency is necessary.

Additional requirements:

- Do not replace established libraries casually.
- Be especially cautious with native dependencies.
- Keep frontend-only dependencies out of the server package.
- Keep server-only dependencies out of the frontend package.
- Use npm to update package manifests and lockfiles.
- Do not manually edit generated lockfile content.

## Implementation Workflow

### Before editing

1. Read the relevant task or issue completely.
2. Read `README.md` and the relevant sections of `CONTRIBUTING.md`.
3. Inspect the nearest related implementation.
4. Inspect existing tests for the affected behavior.
5. Check the current Git diff and working tree.
6. Identify frontend, server, protocol, configuration, and migration impact.
7. Choose the smallest coherent implementation.

Do not overwrite unrelated uncommitted work.

For cross-process or architectural changes, write a brief implementation plan before modifying code.

### During implementation

- Stay within the requested scope.
- Follow existing patterns before creating abstractions.
- Keep changes small and reviewable.
- Avoid unrelated cleanup.
- Add or update tests with the behavior.
- Preserve backward compatibility unless the task explicitly changes it.
- Do not weaken validation, permissions, or tests to make a change pass.
- Do not leave debugging logs, temporary files, or commented-out code.
- Do not add speculative extensibility without a current use case.

### After implementation

1. Review the complete diff.
2. Remove accidental or unrelated changes.
3. Run the appropriate validation commands.
4. Verify that no secrets or personal `.mira/` data were added.
5. Confirm that resources are cleaned up correctly.
6. Update documentation when behavior, configuration, commands, or architecture changed.
7. Report the implementation, tests, risks, and any remaining limitations.

## Validation Commands

| Change type | Minimum validation |
|---|---|
| Documentation only | Review rendered Markdown and verify commands |
| Frontend logic or UI | `npm run lint`, `npm run test`, `npm run build` |
| Server logic | `npm run lint`, `npm run test:server` |
| Shared frontend-server contract | Frontend tests, server tests, build, and relevant end-to-end tests |
| Critical user workflow | `npm run test:e2e` |
| `.mira/` persistence or schema | Unit tests plus serialization and migration coverage |
| PTY or terminal lifecycle | Server tests plus relevant end-to-end or manual lifecycle validation |
| Broad or release-level change | Full unit, server, build, and end-to-end suite |

Available commands:

    npm run lint
    npm run format
    npm run test
    npm run test:server
    npm run test:e2e
    npm run test:coverage
    npm run build

Do not reformat unrelated files. Use the repository's existing Prettier and ESLint configuration.

A bug fix should include a regression test when practical.

## Git Workflow

### Branches

Do not develop directly on `main`.

Use one branch for one logical unit of work:

- `feat/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `test/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

### Commits

Use Conventional Commits:

    <type>(optional-scope): <description>

Examples:

    feat(kanban): send card context to agent session
    fix(pty): terminate process after socket disconnect
    refactor(config): centralize YAML validation
    test(companion): cover cancelled SSE response
    docs(mcp): explain keychain credential storage

Commit rules:

- Keep commits logically scoped.
- Describe the resulting change, not the activity performed.
- Do not combine unrelated changes.
- Do not include generated artifacts unless the repository expects them.
- Do not include `.env`, credentials, personal configuration, coverage output, or temporary workspace data.

Agents must not commit, push, merge, open pull requests, create tags, or publish releases unless explicitly authorized.

## Pull Requests

Every meaningful change should be prepared as a focused, reviewable pull request.

A pull request should include:

- What changed
- Why it changed
- How it was validated
- Screenshots or recordings for visible UI changes
- Configuration or migration impact
- Security or privacy impact
- Known risks or follow-up work

Before opening a pull request:

- Review the diff.
- Run applicable tests.
- Run linting and type checking.
- Verify the production build when applicable.
- Remove debugging code.
- Check for credentials and personal configuration.
- Confirm that unrelated files were not changed.

## Releases

Use Semantic Versioning and `v`-prefixed Git tags:

    vMAJOR.MINOR.PATCH

While Mira Studio remains below `1.0.0`:

- Increment `PATCH` for backward-compatible fixes.
- Increment `MINOR` for new capabilities.
- Use a `MINOR` increment for intentional breaking changes and document them prominently.

After `1.0.0`:

- Increment `MAJOR` for breaking changes.
- Increment `MINOR` for backward-compatible features.
- Increment `PATCH` for backward-compatible fixes.

Release tags must point to the exact commit being released.

Do not bump versions, create tags, generate releases, or publish packages unless explicitly requested.

Release notes should prioritize user-visible behavior rather than internal implementation details.

## Definition of Done

A task is complete when:

- The requested behavior is implemented.
- The implementation follows the architecture contract.
- Relevant tests pass.
- Linting and build checks pass where applicable.
- Frontend and server contracts agree.
- PTYs, streams, listeners, and processes are cleaned up.
- Configuration changes remain migration-safe.
- No secrets or personal state were committed.
- Documentation reflects changed behavior.
- The final diff contains no unrelated changes.
- The implementation summary states what changed and how it was validated.
## Preserved Repository Rules

Rules carried forward from the previous repository guidance that are not
already covered by the sections above:

- SI automation writes only to `mira/si-YYYY-MM-DD-*` branches, may open pull
  requests, and must never merge them.
- MCP connection flows stay conversational through Mira; do not hand-edit
  credential JSON.
- Skills must use declared permissions and Mira primitives.

Single-test examples:

    npx vitest run src/__tests__/stores.test.ts
    npx vitest run --config server/vitest.config.ts server/src/__tests__/health.test.ts

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
