# Mira Studio Secure macOS Runtime Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing v1 React/Fastify/Tauri prototype into a self-contained macOS application with one authenticated local runtime per project window and no system Node.js requirement.

**Architecture:** Continue from `codex/v1-developer-tool` in a fresh worktree and cherry-pick design commit `0c5fb96`. Tauri owns project selection and runtime lifecycle; a bundled Node executable runs the built Fastify server on an ephemeral loopback port. The WebView receives a per-launch runtime descriptor through a narrow Tauri command and authenticates every REST, WebSocket, and streaming request.

**Tech Stack:** Tauri 2.10+, Rust 2021, React 19, TypeScript 5.9, Vite 8, Fastify 5, `@fastify/websocket`, Vitest 4, Cargo tests, Node.js 22+, npm 10+.

## Global Constraints

- Initial platform is macOS only; do not add Windows or Linux compatibility work.
- Use one selected repository and one runtime session per project window.
- Bind the runtime only to `127.0.0.1` on an operating-system-assigned port.
- Production must not depend on a system `node` executable or source checkout.
- Keep REST, WebSocket, and SSE responsibilities separate.
- Never write or log the runtime capability token.
- Do not forward the runtime capability token into agent environments.
- Do not add a production dependency without explicit approval. Before Task 3, obtain approval for `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, and Rust `tauri-plugin-dialog`.
- Use `npm install --legacy-peer-deps` and preserve both npm lockfiles.
- Keep existing user changes and `.mira/` data intact.
- Every task ends with the listed focused test and commit.

## File Ownership Map

| Boundary | Files | Responsibility |
|---|---|---|
| Runtime construction | `server/src/app.ts`, `server/src/runtime-config.ts`, `server/src/index.ts` | Build a testable server and select project/port/origin from validated startup input |
| Local authentication | `server/src/security/runtime-auth.ts`, `server/src/security/runtime-auth.test.ts` | Bearer, WebSocket subprotocol, and Origin validation |
| Client bootstrap | `src/lib/runtime-session.ts`, `src/lib/api-client.ts`, `src/lib/runtime-url.ts`, `src/hooks/useWebSocket.ts` | Retrieve and apply the runtime descriptor to all transports |
| Native lifecycle | `src-tauri/src/runtime.rs`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs` | Project selection, token generation, sidecar supervision, and cleanup |
| Packaging | `scripts/stage-runtime.mjs`, `src-tauri/tauri.conf.json`, `package.json` | Stage the target-matched Node sidecar and production server resources |
| Release verification | `scripts/verify-desktop-bundle.mjs`, `docs/local-macos-development.md` | Prove the packaged app is self-contained and document repeatable commands |

---

### Task 1: Extract a Testable Runtime Factory

**Files:**
- Create: `server/src/runtime-config.ts`
- Create: `server/src/runtime-config.test.ts`
- Create: `server/src/app.ts`
- Create: `server/src/app.test.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/__tests__/health.test.ts`

**Interfaces:**
- Produces: `loadRuntimeConfig(env: NodeJS.ProcessEnv): Promise<RuntimeConfig>`.
- Produces: `createMiraServer(options: MiraServerOptions): Promise<MiraServer>`.
- Produces: `MiraServer.start(): Promise<{ origin: string }>` and `MiraServer.stop(signal: string): Promise<void>`.
- Consumes: existing `resolveProjectRoot`, route registrars, `PtyManager`, `RunStore`, `RunOrchestrator`, and service constructors.

- [ ] **Step 1: Write failing runtime configuration tests**

```ts
it('accepts an operating-system-assigned loopback port', async () => {
  const config = await loadRuntimeConfig({
    MIRA_PROJECT_ROOT: fixtureRoot,
    MIRA_PORT: '0',
    MIRA_CAPABILITY_TOKEN: 'a'.repeat(43),
    MIRA_ALLOWED_ORIGINS: 'tauri://localhost,http://tauri.localhost',
  })
  expect(config.host).toBe('127.0.0.1')
  expect(config.port).toBe(0)
})

it('rejects a missing capability token outside explicit insecure dev mode', async () => {
  await expect(loadRuntimeConfig({ MIRA_PROJECT_ROOT: fixtureRoot })).rejects.toThrow(
    'MIRA_CAPABILITY_TOKEN is required',
  )
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm --prefix server test -- runtime-config.test.ts`

Expected: FAIL because `runtime-config.ts` does not exist.

- [ ] **Step 3: Implement the runtime configuration contract**

```ts
export interface RuntimeConfig {
  projectRoot: string
  host: '127.0.0.1'
  port: number
  capabilityToken: string
  allowedOrigins: string[]
}

export async function loadRuntimeConfig(
  env: NodeJS.ProcessEnv,
): Promise<RuntimeConfig> {
  const projectRoot = await resolveProjectRoot(env.MIRA_PROJECT_ROOT)
  const port = Number(env.MIRA_PORT ?? '0')
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('MIRA_PORT must be an integer from 0 through 65535')
  }
  const capabilityToken = env.MIRA_CAPABILITY_TOKEN ?? ''
  if (capabilityToken.length < 32) {
    throw new Error('MIRA_CAPABILITY_TOKEN is required')
  }
  return {
    projectRoot,
    host: '127.0.0.1',
    port,
    capabilityToken,
    allowedOrigins: (env.MIRA_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }
}
```

- [ ] **Step 4: Write a failing server lifecycle test**

```ts
it('starts on loopback port zero and returns the actual origin', async () => {
  const runtime = await createMiraServer(testOptions({ port: 0 }))
  const { origin } = await runtime.start()
  expect(new URL(origin).hostname).toBe('127.0.0.1')
  expect(Number(new URL(origin).port)).toBeGreaterThan(0)
  await runtime.stop('test')
})
```

- [ ] **Step 5: Extract `createMiraServer` and keep `index.ts` as the process entrypoint**

```ts
export interface MiraServerOptions extends RuntimeConfig {
  logger?: boolean
}

export interface MiraServer {
  app: FastifyInstance
  start(): Promise<{ origin: string }>
  stop(signal: string): Promise<void>
}
```

Move service construction and route registration from `server/src/index.ts` into `createMiraServer`. `start()` must read `app.server.address()` after `listen` and return the actual port. `stop()` must disconnect MCP, kill all PTYs, close Fastify, and be idempotent. `index.ts` must only load configuration, create the runtime, install signal handlers, start it, and write `MIRA_READY {"origin":"..."}` to stdout without the token.

- [ ] **Step 6: Run focused and aggregate server tests**

Run: `npm --prefix server test -- runtime-config.test.ts app.test.ts health.test.ts`

Expected: PASS.

Run: `npm run server:build`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/runtime-config.ts server/src/runtime-config.test.ts server/src/app.ts server/src/app.test.ts server/src/index.ts server/src/__tests__/health.test.ts
git commit -m "refactor(server): extract local runtime lifecycle"
```

### Task 2: Enforce Runtime Authentication and Origin Validation

**Files:**
- Create: `server/src/security/runtime-auth.ts`
- Create: `server/src/security/runtime-auth.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/runs/index.ts`
- Modify: `server/src/ws/pty-route.ts`

**Interfaces:**
- Consumes: `RuntimeConfig.capabilityToken` and `RuntimeConfig.allowedOrigins` from Task 1.
- Produces: `registerRuntimeAuth(server, options): Promise<void>`.
- Produces: `runtimeWebSocketProtocols(token: string): string[]` in the frontend during Task 3; the server contract is `['mira-v1', 'mira-auth.<base64url-token>']`.

- [ ] **Step 1: Write failing HTTP and WebSocket authentication tests**

```ts
it('rejects an API request without the bearer token', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/project' })
  expect(response.statusCode).toBe(401)
})

it('accepts the exact bearer token from an allowed origin', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/project',
    headers: { authorization: `Bearer ${token}`, origin: 'tauri://localhost' },
  })
  expect(response.statusCode).toBe(200)
})

it('rejects an allowed token from an untrusted origin', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/project',
    headers: { authorization: `Bearer ${token}`, origin: 'https://evil.example' },
  })
  expect(response.statusCode).toBe(403)
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm --prefix server test -- runtime-auth.test.ts`

Expected: FAIL because unauthenticated requests currently succeed.

- [ ] **Step 3: Implement constant-time bearer and origin checks**

```ts
export interface RuntimeAuthOptions {
  token: string
  allowedOrigins: ReadonlySet<string>
}

export function bearerMatches(header: string | undefined, token: string): boolean {
  const candidate = header?.startsWith('Bearer ') ? header.slice(7) : ''
  const left = Buffer.from(candidate)
  const right = Buffer.from(token)
  return left.length === right.length && timingSafeEqual(left, right)
}
```

Register an `onRequest` hook before application routes. Permit `OPTIONS` only for configured origins. Require an exact configured Origin for browser requests; allow an absent Origin only for process-local test and health clients that still present the bearer token. Never include the token in an error or log record.

- [ ] **Step 4: Validate WebSocket upgrade headers before attaching handlers**

Parse `Sec-WebSocket-Protocol` into exact comma-separated values. Require both `mira-v1` and `mira-auth.<base64url-token>`, validate Origin, and reject before run or PTY listeners are registered. Echo only `mira-v1` as the selected application protocol.

- [ ] **Step 5: Verify all transports and regression behavior**

Run: `npm --prefix server test -- runtime-auth.test.ts ws/pty-route.test.ts runs/run-orchestrator.test.ts`

Expected: PASS with missing-token, wrong-token, wrong-origin, valid REST, valid run WebSocket, and valid PTY WebSocket coverage.

- [ ] **Step 6: Commit**

```bash
git add server/src/security/runtime-auth.ts server/src/security/runtime-auth.test.ts server/src/app.ts server/src/runs/index.ts server/src/ws/pty-route.ts
git commit -m "feat(security): authenticate local runtime transports"
```

### Task 3: Bootstrap the Authenticated Runtime in React

**Files:**
- Create: `src/lib/runtime-session.ts`
- Create: `src/__tests__/runtime-session.test.ts`
- Modify: `src/lib/api-client.ts`
- Modify: `src/lib/runtime-url.ts`
- Modify: `src/hooks/useWebSocket.ts`
- Modify: `src/App.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Tauri command `runtime_session(windowLabel?: string): Promise<RuntimeSessionDescriptor>` from Task 4; use a development descriptor only when `import.meta.env.DEV` is true.
- Produces: `initializeRuntimeSession(): Promise<RuntimeSessionDescriptor>`.
- Produces: `getRuntimeSession(): RuntimeSessionDescriptor` after initialization.
- Produces: authenticated `apiFetch`, `wsUrl`, and `runtimeWebSocketProtocols`.

- [ ] **Step 1: Obtain dependency approval and install only the approved official packages**

Run after approval: `npm install --legacy-peer-deps @tauri-apps/api@^2 @tauri-apps/plugin-dialog@^2`

Expected: `package.json` and `package-lock.json` contain matching Tauri 2 packages; no other dependency changes.

- [ ] **Step 2: Write failing bootstrap and request tests**

```ts
it('adds the runtime bearer token without mutating caller headers', async () => {
  setRuntimeSession({ origin: 'http://127.0.0.1:43121', token: 'secret' })
  const headers = { 'Content-Type': 'application/json' }
  await apiFetch('/api/project', { headers })
  expect(fetch).toHaveBeenCalledWith(
    'http://127.0.0.1:43121/api/project',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
    }),
  )
  expect(headers).toEqual({ 'Content-Type': 'application/json' })
})

it('encodes WebSocket auth as a subprotocol and never in the URL', () => {
  setRuntimeSession({ origin: 'http://127.0.0.1:43121', token: 'secret' })
  expect(wsUrl('/ws/runs/abc')).not.toContain('secret')
  expect(runtimeWebSocketProtocols()).toEqual(['mira-v1', 'mira-auth.c2VjcmV0'])
})
```

- [ ] **Step 3: Implement the in-memory runtime descriptor**

```ts
export interface RuntimeSessionDescriptor {
  origin: string
  token: string
  projectRoot: string
  windowLabel: string
}

let activeSession: RuntimeSessionDescriptor | null = null

export function getRuntimeSession(): RuntimeSessionDescriptor {
  if (!activeSession) throw new Error('Mira runtime is not initialized')
  return activeSession
}
```

`initializeRuntimeSession` must call `invoke('runtime_session')` in Tauri. In Vite development only, it may read `VITE_MIRA_API_ORIGIN` and `VITE_MIRA_CAPABILITY_TOKEN`; production must fail closed when the native descriptor is unavailable.

- [ ] **Step 4: Update REST and WebSocket clients**

`apiFetch` must merge headers through `new Headers(init?.headers)`, set `Authorization`, and prefix the descriptor origin. `useWebSocket` must accept a protocol array and construct `new WebSocket(url, protocols)`. Every existing socket hook must pass `runtimeWebSocketProtocols()`.

- [ ] **Step 5: Gate application hydration on runtime initialization**

```tsx
if (runtimeState.status === 'starting') return <RuntimeSplash message="Starting local runtime" />
if (runtimeState.status === 'failed') return <RuntimeFailure error={runtimeState.error} />
return <AppShell />
```

Do not issue project, configuration, run, or PTY requests before initialization succeeds.

- [ ] **Step 6: Run focused and frontend checks**

Run: `npm test -- runtime-session.test.ts api-client.test.ts server-health.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/runtime-session.ts src/lib/api-client.ts src/lib/runtime-url.ts src/hooks/useWebSocket.ts src/App.tsx src/vite-env.d.ts src/__tests__/runtime-session.test.ts src/__tests__/api-client.test.ts
git commit -m "feat(desktop): bootstrap authenticated local runtime"
```

### Task 4: Add Native Project Windows and Runtime Supervision

**Files:**
- Create: `src-tauri/src/runtime.rs`
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/build.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: `MIRA_READY {"origin":"..."}` emitted by Task 1.
- Produces: Rust `RuntimeSupervisor` keyed by window label.
- Produces Tauri commands: `runtime_session(window: Window) -> RuntimeSessionDescriptor`, `choose_project(window: Window) -> ProjectOpenResult`, and `close_project(window: Window) -> ()`.
- Produces frontend event: `mira://runtime-failed` with a redacted message.

- [ ] **Step 1: Add the approved native dialog plugin**

Run after approval: `cd src-tauri && cargo add tauri-plugin-dialog@2`

Expected: only `Cargo.toml` and `Cargo.lock` change.

- [ ] **Step 2: Write Rust unit tests for descriptor redaction and project canonicalization**

```rust
#[test]
fn debug_output_never_contains_the_token() {
    let descriptor = RuntimeSessionDescriptor::new(
        "main", "/tmp/project", "http://127.0.0.1:43121", "super-secret"
    );
    assert!(!format!("{descriptor:?}").contains("super-secret"));
}

#[test]
fn project_selection_requires_a_directory() {
    assert!(canonical_project_root(temp_file.path()).is_err());
}
```

- [ ] **Step 3: Implement `RuntimeSupervisor`**

```rust
pub struct RuntimeSupervisor {
    sessions: Mutex<HashMap<String, RuntimeSession>>,
}

struct RuntimeSession {
    project_root: PathBuf,
    origin: String,
    token: SecretString,
    child: CommandChild,
}
```

Generate 32 random bytes through an operating-system RNG and encode them base64url without padding. Spawn one sidecar for the selected project with `MIRA_PROJECT_ROOT`, `MIRA_PORT=0`, `MIRA_CAPABILITY_TOKEN`, and the exact local allowed origins. Consume sidecar stdout until `MIRA_READY` is received with a bounded timeout; forward later stdout/stderr only through token-redacting logs.

- [ ] **Step 4: Implement project commands and window ownership**

`choose_project` must use the native directory dialog, canonicalize the chosen path, reuse the current empty window or create a new uniquely labeled project window, and start exactly one runtime for that window. `runtime_session` returns only that window's descriptor. A window cannot request another window's session.

- [ ] **Step 5: Remove broad frontend process permissions**

Limit `default.json` to `core:default` and the dialog open permission. Register only `runtime_session`, `choose_project`, and `close_project` in `build.rs` and `invoke_handler`. Sidecar spawn remains trusted Rust code rather than a general frontend shell capability.

- [ ] **Step 6: Implement shutdown and failure behavior**

On window destruction, send `SIGTERM`, wait a bounded interval, then kill the child if required. On application exit, drain every session. If a child exits unexpectedly, remove its descriptor and emit a redacted failure event to the owning window.

- [ ] **Step 7: Run Rust checks**

Run: `cd src-tauri && cargo fmt --check && cargo test && cargo clippy -- -D warnings`

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/runtime.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/src/main.rs src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/build.rs src-tauri/capabilities/default.json
git commit -m "feat(desktop): supervise one runtime per project window"
```

### Task 5: Bundle the Node Runtime and Server Resources

**Files:**
- Create: `scripts/stage-runtime.mjs`
- Create: `scripts/stage-runtime.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/runtime.rs`

**Interfaces:**
- Consumes: built server entrypoint `server/dist/index.js` and current target-compatible `process.execPath`.
- Produces: `src-tauri/binaries/mira-runtime-<target-triple>`.
- Produces: `src-tauri/resources/server/{dist,node_modules,package.json}`.
- Produces scripts: `desktop:prepare`, `desktop:dev`, and `desktop:build`.

- [ ] **Step 1: Add the Tauri CLI as a development dependency**

Run: `npm install --save-dev --legacy-peer-deps @tauri-apps/cli@^2`

Expected: `@tauri-apps/cli` appears only in `devDependencies`.

- [ ] **Step 2: Write a failing staging test**

```js
test('stages a target-named executable and production server tree', async () => {
  const result = await stageRuntime({ root: fixtureRoot, nodePath: fixtureNode, arch: 'arm64' })
  assert.equal(result.sidecarName, 'mira-runtime-aarch64-apple-darwin')
  await access(join(result.resourcesDir, 'server', 'dist', 'index.js'))
  await access(join(result.resourcesDir, 'server', 'node_modules', 'node-pty'))
})
```

- [ ] **Step 3: Implement deterministic staging**

`stage-runtime.mjs` must:

1. Reject non-darwin platforms and unsupported architectures.
2. Run `npm run server:build` before copying.
3. Copy the resolved `process.execPath` to the Tauri target-triple filename and preserve executable mode.
4. Copy `server/dist`, `server/package.json`, `server/package-lock.json`, and production `server/node_modules` into `src-tauri/resources/server`.
5. Reject missing `node-pty` or architecture mismatch before Tauri build.
6. Remove only its exact generated staging directories before recreating them.

- [ ] **Step 4: Configure Tauri bundle resources**

```json
{
  "bundle": {
    "targets": ["app", "dmg"],
    "externalBin": ["binaries/mira-runtime"],
    "resources": ["resources/server"]
  }
}
```

Set `beforeBuildCommand` to `npm run desktop:prepare`. The Rust supervisor must call `app.shell().sidecar("mira-runtime")` and pass the bundled `Resources/server/dist/index.js` path as the first argument.

- [ ] **Step 5: Ignore generated bundle staging only**

Add exact ignores for `src-tauri/binaries/mira-runtime-*` and `src-tauri/resources/server/`. Do not ignore the entire `src-tauri/binaries` or `resources` tree.

- [ ] **Step 6: Verify staging and the application bundle**

Run: `node --test scripts/stage-runtime.test.mjs`

Expected: PASS.

Run: `npm run desktop:prepare && npx tauri build --bundles app`

Expected: exit 0 and an `.app` containing the target-named sidecar plus server resources.

- [ ] **Step 7: Commit**

```bash
git add scripts/stage-runtime.mjs scripts/stage-runtime.test.mjs .gitignore package.json package-lock.json src-tauri/tauri.conf.json src-tauri/src/runtime.rs
git commit -m "build(macos): bundle the local Mira runtime"
```

### Task 6: Prove the Desktop Foundation End to End

**Files:**
- Create: `scripts/verify-desktop-bundle.mjs`
- Create: `docs/local-macos-development.md`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Test: `src/__tests__/server-health.test.tsx`
- Test: `server/src/security/runtime-auth.test.ts`

**Interfaces:**
- Consumes: packaged `.app` from Task 5.
- Produces: `npm run desktop:verify` and documented clean-account smoke procedure.

- [ ] **Step 1: Write the bundle verifier**

The script must accept an absolute `.app` path, verify the main executable, sidecar, built server entrypoint, `node-pty` native binary, and absence of symlinks escaping the bundle. It must launch the main executable with a temporary Git repository and a PATH limited to `/usr/bin:/bin`, wait for the runtime-ready log without exposing its token, request shutdown, and assert that no child remains.

```js
const required = [
  'Contents/MacOS/mira-studio',
  'Contents/MacOS/mira-runtime',
  'Contents/Resources/resources/server/dist/index.js',
]
for (const relative of required) await assertInsideBundle(appPath, relative)
```

- [ ] **Step 2: Add scripts and CI foundation checks**

```json
{
  "desktop:prepare": "npm run build && npm run server:build && node scripts/stage-runtime.mjs",
  "desktop:dev": "tauri dev",
  "desktop:build": "tauri build --bundles app,dmg",
  "desktop:verify": "node scripts/verify-desktop-bundle.mjs"
}
```

CI must always run frontend/server/Cargo tests and staging tests. The signed/notarized distribution job remains disabled until Apple credentials are explicitly configured; local validation builds use ad-hoc signing and must not be presented as public distribution artifacts.

- [ ] **Step 3: Document the exact development and smoke flow**

Document prerequisites, dependency installation, `npm run desktop:dev`, `npm run desktop:build`, `npm run desktop:verify -- "src-tauri/target/release/bundle/macos/Mira Studio.app"`, local CLI authentication ownership, ad-hoc signing limitations, and the fact that direct distribution later requires Developer ID signing and notarization.

- [ ] **Step 4: Run the complete foundation gate**

Run: `npm run check`

Run: `cd src-tauri && cargo fmt --check && cargo test && cargo clippy -- -D warnings`

Run: `node --test scripts/stage-runtime.test.mjs`

Run: `npm run desktop:build`

Run: `npm run desktop:verify -- "src-tauri/target/release/bundle/macos/Mira Studio.app"`

Expected: every command exits 0; the app starts with no system Node on PATH and no source checkout dependency.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-desktop-bundle.mjs docs/local-macos-development.md package.json .github/workflows/ci.yml src/__tests__/server-health.test.tsx server/src/security/runtime-auth.test.ts
git commit -m "test(macos): verify the self-contained desktop runtime"
```

## Stage Exit Criteria

- A packaged macOS app can select a repository and start one authenticated runtime for its window.
- REST and WebSocket calls fail without the per-launch token or with an invalid origin.
- Closing the window terminates the runtime and PTY descendants.
- The application launches when no system Node executable is available on PATH.
- The developer's repository is not modified merely by opening it.
- `npm run check`, Cargo checks, staging tests, desktop build, and bundle verification all pass.
