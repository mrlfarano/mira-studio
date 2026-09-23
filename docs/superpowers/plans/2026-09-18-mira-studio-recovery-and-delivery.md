# Mira Studio Recovery and Delivery Implementation Plan

> **For execution:** Use the existing stage-specific plans and `executing-plans` task by task after implementation is authorized. This is a program-level plan, not replacement domain contracts or authorization to implement. No worker dispatch, source edits, installation, Git metadata repair, license acceptance, commits, pushes, or releases are authorized by this document.

**Goal:** Restore trustworthy local cockpit persistence, re-establish native/runtime acceptance, complete the existing Project Interview UI, and progress through the already specified executable graph and Plan/Run/Review experience to an explicitly approved local result.

**Architecture:** Continue the newer local-graph worktree foundation. Reuse the authenticated Fastify runtime, runtime-session transport, React/Zustand stores, existing durable runs, installed-CLI adapters, Git workspace isolation, and verification services. Repair persistence as one coordinated change before enabling browser writes. The approved graph contracts remain in the existing stage plans.

**Tech stack:** Existing React 19, TypeScript 5.9, Vite 8, Zustand 5, Fastify 5, Tauri 2/Rust, node-pty, simple-git, js-yaml, Vitest, Testing Library and Playwright. Retain the repository's npm scripts, ESLint and Prettier. Do not migrate tooling or add dependencies as incidental cleanup.

**Plan status:** Prepared by the project manager and reviewed by the coordinator on 2026-09-18. Published as the requested planning deliverable at `docs/superpowers/plans/2026-09-18-mira-studio-recovery-and-delivery.md`. All implementation task statuses below are planned, not completed. This document does not authorize implementation, environment changes, commits, pushes or releases.

## 1. Authority, evidence and scope

### Documents that govern this plan

All relative paths below refer to Mira Studio. Read the newer worktree copy when executing production work.

| Alias | Existing document | Role |
|---|---|---|
| DESIGN | `docs/superpowers/specs/2026-08-08-mira-studio-local-graph-mvp-design.md` | Established technical requirements, golden paths, consent and scope |
| ROADMAP | `docs/superpowers/plans/2026-08-08-mira-studio-local-graph-mvp-roadmap.md` | Four-stage ordering and exit criteria |
| S1 | `docs/superpowers/plans/2026-08-08-mira-studio-desktop-foundation.md` | Desktop/runtime/security foundation |
| S2 | `docs/superpowers/plans/2026-08-08-mira-studio-project-interview.md` | Interview and portable sourced definition, especially Task 6 at line 403 |
| S3 | `docs/superpowers/plans/2026-08-08-mira-studio-executable-graph.md` | Graph domain, runtime, integration and delivery contracts |
| S4 | `docs/superpowers/plans/2026-08-08-mira-studio-graph-experience.md` | Client graph, evidence, review, shell and packaged golden paths |
| EVIDENCE | `/Users/la/.jcode/scratch/mira-review-requirement-evidence-20260918.md` | Review outcomes, with the Second-pass review section authoritative over earlier diagnoses |

Also inspected root `AGENTS.md`, `docs/product-idea.md`, and `docs/validation-report.md`. The purpose is a local-first coding cockpit for solo developers, developing toward verification-first graph execution. The validation report still says **Weak** and recommends validating graph necessity before investing in runtime orchestration. The existing approved technical roadmap describes a graph MVP. These are different kinds of evidence: a technical plan is not customer validation. Preserve the approved technical scope, but require a sponsor go/no-go before Stage 3 investment. Ask whether to proceed under the existing MVP commitment or pause for the documented concierge validation. Do not imply that interviews, willingness to pay, or graph value have already been demonstrated.

### Established requirements versus planning recommendations

**Established:** macOS local-first app, one repository per window, no system Node requirement, installed already-authenticated Codex/Claude CLIs, new and existing repositories, quick/guided/import interviews, sourced editable Project Definition, deterministic executable graph, isolated agent worktrees, durable evidence and retries, explicit execution/integration/delivery approvals, safe local delivery, keyboard accessibility, no required telemetry. DESIGN §§Goals, Golden Paths, Project Interview, Graph Execution, Failure and Recovery and Release Gates govern acceptance.

**Planning recommendations:** P0/P1 labels, task decomposition, a single persistence integration gate, suggested branch names, and proposed regression file names in this document. They do not change the product schema or invent a new feature.

**Not established:** commercial viability, successful real PTY interaction, duplicate browser terminal input, fresh packaged delivery, or complete existing-suite success. Architecture extraction remains bounded detected signals and explicitly uncertain inferences, not automatic architectural truth.

**Explicit exclusions:** managed inference, billing, accounts, hosted backends, direct provider API additions, team collaboration, general-purpose canvas upgrades, editor/file-manager features, GraphRAG, Windows/Linux release work, broad refactors, unrelated prototype cleanup, dependency/tool replacement. Product delivery does not push, create PRs, deploy, hard-reset, rewrite history, or merge automatically. Human repository-development PR review is separate from product delivery capabilities.

## 2. Baseline and evidence ledger

Execution baseline is `/Users/la/dev/.worktrees/mira-studio-local-graph-mvp`, branch `feat/local-graph-mvp`, reported HEAD `1a3eea4`. Its `.git` pointer is stale. The known metadata override is:

```bash
/opt/homebrew/bin/git --git-dir=/Users/la/dev/personal/mira-studio/.git/worktrees/mira-studio-local-graph-mvp \
  --work-tree=/Users/la/dev/.worktrees/mira-studio-local-graph-mvp status --short --branch
```

This override avoids repairing metadata. The project manager's Git invocation encountered the unaccepted Xcode license, but the coordinator verified the already-installed `/opt/homebrew/bin/git` (2.54.0) works. The coordinator independently confirmed newer HEAD `1a3eea4` and clean tracked status using the override, and preserved the root checkout's 47 existing status entries before adding only this plan. Tests that explicitly execute `/usr/bin/git` remain license-blocked despite Homebrew Git working. Never interpret an empty pipeline result as clean status when Git itself failed. Preserve all existing dirty work.

| Observation | Classification | Consequence |
|---|---|---|
| Chromium preflight allows only GET, HEAD, POST and rejects workspace PUT | Confirmed newer-branch P0 persistence defect | Fix only in coordinated batch below |
| Saved terminal-only GET succeeds, UI still renders default Run Review | Confirmed newer-branch P0 hydration defect | Restore before default seeding |
| Build + Debug switch attempts Build layout save to `/workspaces/default` | Confirmed wrong destination, potential corruption once PUT works | No standalone CORS rollout |
| One scene switch produces three toggle PUT attempts per workspace within 960 ms | Confirmed rollback subscription loop under failed PUT | Suppress remote-application echoes and retain legitimate local edits |
| onData disposable discarded, attachment callback depends on connection state | Static lifecycle concern | Test and investigate, do not claim reproduced duplicate input |
| Browser dimensions errors and zero observed terminal input frames | Actual symptom, root cause undetermined | Investigate separately from duplicate-listener hypothesis |
| Installed node-pty spawn-helper mode 0644, EACCES/posix_spawnp failure | Local dependency prerequisite | Not evidence of a fresh package chmod defect; stage-runtime already handles execute bits |
| Xcode license prevents helper compilation and `/usr/bin/git` fixture setup | User-controlled environment prerequisite | No license acceptance or installation by implementation agent without authorization |
| Verification bundle lacks `server/dist/native/mira-process-identity` | Existing artifact acceptance failure | Fresh-build investigation, not automatic source-bug conclusion |
| Production bundle verifier passes against August 9 executable | Historical artifact evidence only | Not proof of current HEAD build |
| Newer real TCP auth401, foreign-origin403, traversal400 and WS auth checks pass | Scoped security regression evidence | Preserve boundaries, do not reimplement old omissions or claim blanket security pass |

Historical checks from EVIDENCE: root 66 frontend/154 server tests passed, but server build and lint failed and Playwright discovered zero tests. Newer branch 127 frontend and 322 targeted server tests passed, lint/frontend build/server TypeScript checks passed, while standard native prebuild/pretest were blocked. Later desktop scripts had 12 pass/19 fail, with 19 failures at Git fixture setup, not 19 product defects. Another targeted server run had 408 pass/7 fail/21 skipped, including setup-dependent auth cases and cleanup fallout. These are different test selections and must not be summed into a claim of a complete passing suite.

S2 backend Tasks 1–5 exist. S2 Task 6 planning UI, S3 graph runtime and S4 graph UI are absent. Continue them, do not rebuild the implemented foundation. `RuntimeApp.tsx` now owns hydration/default seeding, so older App-only task anchors need adaptation.

## 3. Milestones and dependency order

Priority means urgency within this recovery program, not a calendar estimate.

| Milestone | Tasks | Exit gate | Dependency |
|---|---|---|---|
| M0: authorized, reproducible baseline | PRE-01, PRE-02, PRE-03 | Safe implementation location, explicit environment decisions, retained baseline evidence | Implementation authorization |
| M1: trustworthy cockpit persistence | FIX-01 through FIX-05, GATE-01 | All three real Chromium regressions and bounded autosave pass against real runtime | PRE-01; full lifecycle gate also requires PRE-02 |
| M2: native and terminal foundation accepted | INV-01, FIX-06, INV-02, GATE-02 | Real PTY and fresh package lifecycle succeed or release remains blocked | PRE-02; package verification includes M1 |
| M3: complete Project Interview | PLAN-01 through PLAN-03 | S2 exit criteria and real browser planning journey | M1 and M2 accepted for stage exit |
| M4: executable graph backend | GRAPH-01 through GRAPH-08 | S3 exit criteria, public API integration and crash recovery | M3, sponsor graph go/no-go |
| M5: graph-first delivery experience | UI-01 through UI-07 | S4 and DESIGN release gates | M4 |

M0 environment diagnosis can run alongside persistence unit-test design. INV-01 inspection can run alongside M1 without overlapping edits. Do not let blocked native tests prevent writing focused persistence regressions, but never label the aggregate stage passed by bypassing native hooks. No workers are requested or authorized for this planning session. Parallelizable below describes future scheduling, not a dispatch instruction.

## 4. Prerequisites and approval gates

### PRE-01 [prerequisite]: preserve checkout provenance

**Targets:** working-tree inventory and reviewed diff only, no product file changes. **Dependencies:** implementation authorization.

- [ ] Record root branch/status and newer branch/HEAD/status using a working, already-installed Git executable and the explicit gitdir override. If unavailable, stop Git-dependent work and report the environment gate. Never treat empty error output as clean status.
- [ ] Have the coordinator approve the production-work location and base. Recommended first logical branch: `fix/workspace-persistence` based on the reviewed newer HEAD in an authorized isolated checkout. Do not develop production fixes in the 47-entry dirty root.
- [ ] Do not replay ROADMAP's historical branch recreation, initial dependency installation, or design cherry-pick `0c5fb96`. Do not reset, stash, clean, switch the dirty root, repair pointers, or create a worktree implicitly.
- [ ] Compare only task-owned paths against the recorded baseline after each batch. Keep scratch/browser profiles, test projects, runtime tokens and generated artifacts out of Git.

**Acceptance:** the implementer can identify exactly which base and owned files will change, with no unrelated user work hidden or moved. Commits, push, PR publication, merge, tags and releases remain separately authorized actions. If authorized later, use scoped Conventional Commits and PRs explaining changes, reasons, tests and risks.

### PRE-02 [prerequisite]: native/Git environment decision

**Targets:** `docs/local-macos-development.md`, existing `server/scripts/build-process-identity-helper.mjs`, local toolchain diagnostics, installed node-pty helper path. **Dependencies:** none for read-only diagnosis.

- [ ] Present the Xcode license blocker to the user. Only the user or an explicitly authorized operator reviews/accepts it. Do not silently switch toolchains, accept licenses, install tools, or chmod dependencies.
- [ ] Request an explicit decision about repairing the local dependency installation/helper executable permission. Packaging already sets execute bits in `scripts/stage-runtime.mjs:82–96,133`; do not duplicate that behavior without a failing fresh-package test.
- [ ] After authorized remediation, rerun helper build, Git fixture setup, standard server build/test hooks and native PTY smoke tests. Record version, executable path and exit status without environment secrets.

**Acceptance:** real prerequisites work, or dependent gates remain visibly blocked with owner/action. An environment workaround is not a product fix.

### PRE-03 [prerequisite]: scope and test-dependency checkpoints

**Targets:** DESIGN, validation report, S4 Task 7, package manifests.

- [ ] Sponsor chooses whether to continue S3 under the existing technical MVP plan despite weak customer validation or pause for the existing validation sprint. No invented customer research claim or new telemetry feature.
- [ ] Before S4 packaged WebDriver work, check whether the required test-only dependencies are already present. S4 Task 7 proposes `@wdio/cli`, `@wdio/local-runner`, `@wdio/mocha-framework`, `@wdio/spec-reporter`, `@wdio/tauri-service`, and optional Rust `tauri-plugin-wdio-webdriver` / `tauri-plugin-wdio`. The project dependency policy requires approval before adding them. Request approval before adding anything. Reuse current verification facilities when sufficient, but do not substitute bundle inspection for actual packaged UI acceptance.
- [ ] Treat manual installed-CLI smoke runs and any provider usage as explicit user-approved actions. CI uses deterministic fake CLI executables, not live inference.

### VAL-01 [owner-run parallel track]: resolve the validation/roadmap tension

**References:** `docs/validation-sprint.md:17–27,166–188`, `docs/validation-report.md`, `docs/validation-templates/interview-session.md`, `docs/validation-templates/pilot-session.md`. **Owner:** product owner, not the implementation agent. **Dependencies:** no graph implementation required. Run alongside M1–M3 using the existing concierge approach, not a new product feature.

- [ ] Complete 6 eligible interviews. At least 3 must independently identify a coordination/verification failure in the previous 30 days with quantified time, rework or ship-risk cost.
- [ ] Run 3 real-feature/repository pilots. At least 2 must expose branching, resumability, approval, recovery or parallel-dependency behavior that a linear list/single-agent loop does not handle well.
- [ ] At least 2 pilots must complete the feature-graph flow and use it for a next-task or ship/blocked decision.
- [ ] At least 2 pilots must reduce time-to-next-safe-task or time-to-defensible-ship-decision by 30%, with graph upkeep costing less time than it saves.
- [ ] At least 1 participant must actually pay $99 for the founding continuation. A compliment, waitlist signup, commitment or non-binding promise is not payment. This owner-run validation offer does not authorize adding billing to Mira.
- [ ] Record evidence and a proceed/narrow/stop decision. All five sprint gates passing supports proceeding. Otherwise use the sprint's narrow/stop rules, or obtain an explicit owner decision to proceed with the technical Stage 3/4 plan despite weak validation, documenting the accepted risk. Do not silently choose between conflicting documents.

The current sprint only marks 12 candidates identified and 6 requests sent as complete. Acceptances, completed interviews, pilots, payment and decision remain unchecked. No outreach, payment collection or research outcome was performed or inferred in this planning session. This task adds no calendar estimate beyond referencing the existing sprint. Recommend repairing the cockpit and completing the narrow planning slice while this track runs, with full graph expansion conditional on the recorded gate or explicit owner override.

## 5. First executable batch: coordinated P0 persistence repair

**Delivery unit:** FIX-01–05 plus GATE-01 is one release-blocking integration batch. Internal tasks may be reviewed separately, but **never deploy or merge a CORS-only repair**. Enabling PUT before hydration, destination and echo fixes can expose previously blocked reseed/wrong-workspace writes.

### FIX-01: capture failing persistence contracts

**Dependencies:** PRE-01. **Proposed test files:** `src/__tests__/workspace-persistence.test.ts`, `src/__tests__/config-sync.test.ts`, `src/__tests__/runtime-hydration.test.tsx`, `e2e/specs/workspace-persistence.spec.ts`. Extend `server/src/app.test.ts` and `server/src/security/runtime-auth.test.ts` for preflight policy. Reuse `src/__tests__/stores.test.ts` utilities where applicable.

- [ ] Add fake-timer store tests for remote layout application versus user layout edits, explicit workspace ownership, switching during a pending 500 ms save, and out-of-order scene GET completion.
- [ ] Add hydration tests with a deliberately delayed workspace response. A saved terminal-only layout must not receive Run Review; an intentional empty layout remains empty; failed GET is not permission to overwrite server data with defaults.
- [ ] Add config-sync tests for successful canonical response and failed PUT followed by successful rollback GET. Advance timers across multiple 300 ms debounce windows and assert no additional save without a local change. Cover toggles and companion separately, and retain core-config `isSyncing` behavior.
- [ ] Add tests for local edit during an in-flight save, stale response after a scene switch, repeated start/stop of subscriptions, and cleanup of pending/in-flight callbacks after project unmount. Do not fix echoes with a single global flag that drops unrelated workspace changes.
- [ ] Add browser regression fixtures from the review drivers using isolated projects, actual authenticated runtime and Chromium. Run before implementation and save failing evidence identifying CORS, reload mismatch and wrong attempted destination.

**Acceptance:** regressions fail for the reported reasons on the baseline. Mocked unit tests establish race behavior, not browser acceptance.

### FIX-02: restore layouts before seeding defaults

**Targets:** `src/store/hydrate.ts:65–72`, `src/components/RuntimeApp.tsx:24–46`, `src/store/layout-store.ts`, `src/types/config.ts`, existing panel types. **Dependencies:** FIX-01.

- [ ] Establish a hydration result that distinguishes loaded, missing/default-initialization policy, and failed. Honor the configured active workspace rather than assuming every project renders `default`.
- [ ] Apply the persisted layout via a non-persisting store action. Reuse panel conversion conventions from `scene-store.ts`, keeping the portable layout shape unchanged.
- [ ] Await hydration before default initialization. Seed only when the server contract genuinely calls for initial defaults, never merely because `panels.length === 0`, and never because a fetch failed.
- [ ] Make repeated mount/hydration safe and show actionable load/save errors using existing error surfaces. Avoid introducing a second onboarding or persistence authority.
- [ ] Run the delayed-hydration, intentional-empty, remount and failed-fetch tests plus existing App/store tests.

**Acceptance:** saved layout is rendered exactly after reload with no mount-time reseed PUT. A temporary load failure cannot overwrite persisted workspace state.

### FIX-03: bind every layout mutation to its owning workspace

**Targets:** `src/store/layout-store.ts:24–27,142–144`, `src/store/scene-store.ts:121–125`, `src/store/toggle-store.ts`, `src/store/config-store.ts` as needed for existing workspace state. **Dependencies:** FIX-01; coordinate action contract with FIX-02.

- [ ] Separate remote workspace activation/replacement from user-edit persistence. Hydration, scene GETs and swapping cached workspaces must not be treated as user layout edits.
- [ ] Capture workspace identity and layout payload when an edit is scheduled. Use per-workspace pending saves or flush the old workspace's pending save before activation, with explicit tested semantics. Never resolve the destination from whichever workspace is active at timer fire.
- [ ] Apply active workspace, corresponding layout and scene selection coherently. Guard concurrent scene requests so a slow older switch cannot replace a newer selection.
- [ ] Keep cached workspace layouts coherent with local edits so swapping does not resurrect stale layout. Check HTTP status, not only rejected promises, and surface failures without an unbounded retry loop.
- [ ] Run pending-save/switch, scene swap, different workspace and stale-response tests.

**Acceptance:** switching to Build + Debug emits no layout write simply for loading Build. Editing Build writes only Build, editing Debug writes only Debug, and Default's original bytes/layout stay unchanged. A queued Default edit remains owned by Default after switching.

### FIX-04: suppress server echoes without losing user edits

**Targets:** `src/store/middleware/config-sync.ts:132–147,190–199`, companion subscription and response paths in the same file, `hydrate.ts`, `scene-store.ts`, supporting store actions as needed. **Dependencies:** FIX-01; shared remote-application convention with FIX-02/03.

- [ ] Mark server-origin application explicitly or suppress subscribers only around the synchronous canonical/rollback application for the relevant slice. Do not suspend all saving for the duration of every HTTP request.
- [ ] Ensure hydration, scene fetch, successful PUT response and fallback GET do not enqueue autosaves. Preserve debouncing for actual user changes.
- [ ] Track request ordering per persisted slice/workspace so a stale response cannot clobber a newer user edit. Define bounded failure recovery: one failed user save may fetch canonical state once, but neither response may create another save.
- [ ] Ensure stop/unmount cancels timers and invalidates late callbacks. Retain errors if both PUT and fallback GET fail. Do not describe core-config's already guarded path as the same unconditional loop.
- [ ] Run toggle, companion, success, rollback, concurrent-edit and repeated-subscription tests.

**Acceptance:** one settled user edit produces at most one debounced PUT for that slice, plus one fallback GET if needed. No request growth occurs during at least three further debounce windows. A new user edit still saves even while an unrelated slice is in flight.

### FIX-05: allow supported browser mutation methods without weakening security

**Targets:** `server/src/app.ts:57–61`, route method inventory in server modules, `server/src/app.test.ts`, `server/src/security/runtime-auth.test.ts`, `src/lib/runtime-session.ts:76–88` as a consumed transport contract. **Dependencies:** FIX-01. Integration must include FIX-02–04.

- [ ] Inventory currently registered GET/HEAD/POST/PUT/PATCH/DELETE routes and declare the actual supported cross-origin method list in the existing CORS registration. Do not add methods speculatively or relax allowed-origin/token checks.
- [ ] Verify browser preflight can request PUT and the existing authorization header. Test PATCH/DELETE if the registered frontend/API workflow uses them.
- [ ] Preserve authenticated health, unauthorized HTTP/WS rejection and foreign-origin rejection. Preflight success alone must not authorize the subsequent request.
- [ ] Run focused server policy tests, then test real TCP preflight and a real Chromium PUT with runtime authentication enabled.

**Acceptance:** the supported development browser transport can persist, unauthorized mutations cannot, and no wildcard trust expansion is introduced.

### GATE-01: real-browser persistence acceptance

**Targets:** `e2e/specs/workspace-persistence.spec.ts`, `playwright.config.ts`, isolated-runtime test fixture under `e2e/fixtures/` if needed, test documentation in `docs/local-macos-development.md`. **Dependencies:** all FIX-01–05.

The current Playwright configuration starts a repo-root server, probes unauthenticated `/api/health`, and reuses existing servers. Do not rely on that configuration for isolated authenticated persistence acceptance. Adapt only the required fixture/config boundary to create a scratch project and fresh token, start the actual server/Vite via supported runtime configuration, wait for authenticated readiness, and tear down only owned processes. Never use the developer's `.mira` as a test database.

Required runs use actual Chromium, actual HTTP/WebSocket transport, real YAML/JSON persistence and no route interception or browser-store injection:

1. **Reload:** enter through real onboarding/Skip setup where applicable, close Run Review, assert successful PUT response, GET the terminal-only layout, poll disk within a bounded budget covering the documented debounce, reload and assert Run Review remains absent. Also seed saved layout through the supported API before launch and verify initial rendering with no reseed write.
2. **Destination:** create Default/Build/Debug with distinguishable layouts through authenticated APIs, click the existing scene picker and Build + Debug. Capture every attempted URL and payload. Assert no Build-layout PUT to Default. Edit Build, switch/swap and edit Debug, then verify all three persisted layouts and reload each. Observe at least three debounce windows after settling.
3. **Autosave:** one scene switch must not create repeated toggle saves. Verify an actual panel edit settles in the real browser with no response-driven PUTs. Cover explicit toggle and companion edits through component/store tests for both success and failed PUT followed by successful rollback GET. `TogglePanel.tsx` is not currently mounted in the application shell, so do not invent a hidden browser control or add a new feature solely to exercise it. Use a reachable toggle control for browser coverage only if existing product wiring exposes one. Add a real failure-recovery browser case through a controlled server/network outage if the harness can induce it without mocking routes. Count requests, not merely final state.
4. **Security boundary:** real TCP unauthenticated HTTP returns 401, foreign origin 403, unauthenticated WS rejects, authenticated WS connects, traversal rejects without changing protected bytes. Keep these scoped checks distinct from a complete security audit.

Retain redacted request timelines, screenshots for failures, server exit status, on-disk observations and exact source revision. No terminal success claim is required for persistence, but terminal console errors must be recorded separately rather than hidden.

**First batch commands, after its test files exist:**

```bash
npm test -- workspace-persistence.test.ts config-sync.test.ts runtime-hydration.test.tsx stores.test.ts App.test.tsx
npm --prefix server test -- app.test.ts security/runtime-auth.test.ts
npm run lint
npm run build
npm run server:build
CI=true npm run test:e2e -- e2e/specs/workspace-persistence.spec.ts --project=chromium
```

Expected: relevant tests are actually discovered and pass, lint/build exit 0, and all three browser invariants are proved. If native pretest/prebuild blocks, record that result. A direct existing Vitest/TypeScript invocation may be diagnostic only and must be explicitly labeled as bypassing hooks, not reported as `npm run check` success. Do not install missing executables with npx or otherwise.

## 6. P1 investigations and conditional fixes

### INV-01: isolate terminal failure before assigning a fix

**Targets:** `src/panels/terminal/useTerminal.ts:79–88`, `src/panels/terminal/TerminalPanel.tsx:190–194`, existing `src/hooks/useWebSocket.ts`, `server/src/ws/pty-route.ts`, `server/src/pty/pty-manager.ts`. **Dependencies:** PRE-02 for real native shell acceptance. Source inspection can run during M1.

- [ ] Reproduce dimensions errors with visible/hidden panel, resize, scene switch and reconnect, recording xterm lifecycle and socket frames without logging entered secrets.
- [ ] Compare actual PTY spawn, resize, input, output and exit messages with current structured protocol. Separate missing/native spawn from client attach/fit ordering.
- [ ] Create a minimal regression for the confirmed root cause before changing sizing, attachment or socket code. Do not replace terminal libraries or blame duplicate listeners for zero input frames without evidence.

**Acceptance:** a bounded diagnosis maps each observed symptom to a failing test, or leaves an explicit unresolved investigation blocking terminal acceptance.

### FIX-06: terminal listener lifecycle and confirmed rendering repair

**Targets:** `src/panels/terminal/useTerminal.ts`, `TerminalPanel.tsx`; proposed `src/__tests__/terminal-lifecycle.test.tsx`, existing PTY/socket tests and terminal E2E spec discovered in the newer tree. **Dependencies:** INV-01.

- [ ] Retain/dispose xterm input subscriptions at detach/unmount and prevent duplicate registration on reconnect. Add a fake disposable test with repeated attach/cleanup to prove one live listener, not an unsupported historical duplicate-input claim.
- [ ] Apply only the diagnosed minimum sizing/mount correction with a separate regression if needed. Do not guess a dimensions fix in advance.
- [ ] In a real browser with repaired local prerequisites, type a unique non-secret shell marker, assert the expected input frame count, shell output, resize behavior and clean exit. Repeat after reconnect and scene changes.

**Acceptance:** real input/output/exit works, lifecycle tests pass, and the diagnosed dimensions error no longer reproduces. Preserve the existing session-persistence contract: panel detachment or a WebSocket disconnect must not automatically kill a resumable PTY. Verify explicit kill and application/runtime shutdown clean up owned PTYs and descendants without affecting unrelated processes. Mock terminal tests alone do not close this task.

### INV-02: fresh package provenance and process-identity helper

**Targets:** `scripts/stage-runtime.mjs`, `scripts/stage-runtime.test.mjs`, `scripts/verify-desktop-bundle.mjs`, `scripts/verify-desktop-bundle.test.mjs`, `server/scripts/build-process-identity-helper.mjs`, `src-tauri/src/runtime.rs`, `src-tauri/tauri.desktop-verification.conf.json`, `docs/local-macos-development.md`. **Dependencies:** PRE-02.

- [ ] Build current source through normal scripts, inventory the staged/bundled identity helper and native modules, and check executable architecture/mode for arm64 and x64 staging coverage.
- [ ] Rebuild the verification app and retest. If the missing helper persists in a fresh artifact, add a failing staging/bundle test and make the smallest packaging fix. If it disappears, classify the old bundle as stale/incomplete, not a repaired source defect.
- [ ] Rerun all desktop script tests and auth fixtures previously blocked at Git setup. Address any genuinely remaining failures individually. Improve setup-failure cleanup only if still demonstrated, not by weakening lifecycle assertions.

### GATE-02: current foundation accepted

**Dependencies:** GATE-01, FIX-06, INV-02.

```bash
npm run check
npm run test:desktop-scripts
(cd src-tauri && cargo fmt --check && cargo test && cargo clippy -- -D warnings)
npm run desktop:build
npm run desktop:verify -- "$PWD/src-tauri/target/release/bundle/macos/Mira Studio.app"
npm run desktop:build:verification
npm run desktop:verify:verification -- "$PWD/src-tauri/target/desktop-verification/release/bundle/macos/Mira Studio Runtime Verification.app"
```

Use the actual absolute emitted bundle path if build output differs. The verifier requires an absolute `.app` path. Record source HEAD plus dirty diff identity, build timestamp and artifact identity. Verify runtime startup/authentication, PTY operation, process ownership and shutdown without relying on a system Node executable or checkout resources. Follow existing verifier cross-session ownership constraints. A stale production verifier pass never substitutes for this gate.

## 7. Complete Stage 2, not its already implemented backend

### PLAN-01 [planned feature]: wire the existing interview contract

**Reference:** S2 Task 6, consuming Tasks 1–5. **Dependencies:** M1; full stage acceptance waits for M2.

**Create:** `src/store/project-definition-store.ts` and focused tests in `src/__tests__/project-definition-store.test.ts`. **Consume:** `src/types/project-definition.ts`, `server/src/interview/index.ts`, `server/src/interview/types.ts`, `server/src/project-definition/store.ts`, runtime API client.

- [ ] Read actual implemented routes/types, not just plan pseudocode. Implement the planned start/answer/skip/patch/confirm/resume/cancel actions against those contracts.
- [ ] Add failing tests for active-session and revision guards, stale/out-of-order responses, HTTP 409 latest-definition handling, cancellation, reload and transport error visibility.
- [ ] Preserve source/confirmation semantics and canonical portable YAML. Do not create an independent client schema, provider API path or second onboarding authority.

**Acceptance:** a fake structured CLI through real backend routes yields a resumable draft, rejected stale writes do not silently lose edits, and recommendations stay unconfirmed until the user acts.

### PLAN-02 [planned feature]: live sourced planning workspace

**Reference:** S2 Task 6. **Dependencies:** PLAN-01.

**Create:** `src/features/planning/PlanningWorkspace.tsx`, `InterviewPane.tsx`, `ProjectDefinitionPane.tsx`, `SourceLabel.tsx`, `planning.css`, `src/__tests__/planning-workspace.test.tsx`. **Modify minimally:** `src/components/RuntimeApp.tsx`, `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/OnboardingWizard.tsx`, `src/index.css` as required by actual mount ownership.

- [ ] Implement Quick interview, Guided interview and Import existing definition using native selection and the existing bounded import service. Show selected file and content hash, not credentials or hosted options.
- [ ] Show one question beside the live definition with Answer, Skip, Pause/resume and direct editing. Source labels must be readable text, not color alone. Separate detected facts, assumptions, recommendations, confirmed decisions and open questions.
- [ ] Enter Plan for an unconfirmed project definition. If migrating prototype onboarding, do it once as unconfirmed developer-sourced input and test idempotence.
- [ ] Test keyboard/focus flow, 409 conflict messaging, import rejection, missing CLI and cancellation without data loss.

**Acceptance:** all S2 Task 6 behavior passes without graph functionality being invented prematurely.

### PLAN-03 [stage gate]: real planning journey and definition durability

**Targets:** `e2e/specs/onboarding.spec.ts`, `src/__tests__/planning-workspace.test.tsx`, S2 existing backend tests; document test evidence. **Dependencies:** PLAN-02 and GATE-02.

- [ ] Run quick, guided, import, skip, pause/restart/resume, editing and confirmation through real UI/public APIs with a deterministic fake CLI executable.
- [ ] Test new and existing repositories. Existing facts are read-only/bounded, unknown architecture remains explicitly unconfirmed, and pre-existing dirty files remain byte-identical.
- [ ] Inspect `.mira/project-definition.yml` for provenance and confirmed state after restart. Verify stale revision responses and corrupt-file preservation from existing backend tests.
- [ ] Confirm CLI invocation and schema validation paths remain as implemented, with no direct provider call. After user approval, smoke-test each installed/authenticated real CLI outside CI.

Run S2's focused frontend/server commands and actual onboarding E2E. Stage exit requires meaningful test discovery, source labels/accessibility and persistence, not just component snapshots.

## 8. Stage 3 task backlog, preserving existing contracts

Before starting: PLAN-03 accepted, PRE-03 sponsor decision recorded. For every row, follow the referenced S3 task's exact interfaces and TDD steps. Do not substitute a graph framework or remodel the existing runtime. Each task starts by running its new focused regression red and ends with that task's named tests plus affected existing tests green.

| ID / priority | Existing task and exact production targets | Dependencies / safe parallelism | Acceptance and regression focus |
|---|---|---|---|
| GRAPH-01 / planned | S3 Task 1 (line 40): `server/src/graph/types.ts`, `validation.ts`, `state-machine.ts`, `src/types/graph.ts` | PLAN-03, sponsor go | All specified node/edge/state contracts, DAG cycles, references, scope/evidence, goal reachability and required delivery approval validated. `graph/validation.test.ts`, `graph/state-machine.test.ts` |
| GRAPH-02 / planned | S3 Task 2 (131): `server/src/graph/graph-store.ts`, `server/src/graph-run/types.ts`, `store.ts`, existing `server/src/runs/run-store.ts` | GRAPH-01 | Atomic portable drafts, revision conflicts, immutable definition/graph snapshots, serialized monotonic events, safe recoverable legacy run migration. `graph/graph-store.test.ts`, `graph-run/store.test.ts`, `runs/run-store.test.ts` |
| GRAPH-03 / planned | S3 Task 3 (220): `server/src/graph/graph-schema.ts`, `graph-planner.ts`, existing `server/src/agents/structured-agent.ts` | GRAPH-01/02; can parallel GRAPH-04 if file ownership respected | Confirmed definition to validated editable proposal, bounded repair, invalid proposal never executes. `graph/graph-planner.test.ts`, existing structured-agent tests |
| GRAPH-04 / planned | S3 Task 4 (270): `server/src/graph-run/scheduler.ts`, `server/src/graph/state-machine.ts` | GRAPH-01/02 | Deterministic readiness, approval waiting, bounded concurrency, scope overlap prevention, downstream staleness and finite retries. `graph-run/scheduler.test.ts`, state-machine tests |
| GRAPH-05 / planned | S3 Task 5 (327): `server/src/runs/types.ts`, `run-store.ts`, `run-orchestrator.ts`, `server/src/workspace/git-workspace-service.ts`, `server/src/pty/pty-manager.ts`, `src/types/run.ts` | GRAPH-02/04, real PTY gate | Register owned worktree before spawn, node/attempt linkage, no shared terminal/token access, truthful exit/cancel and scope checks. Existing run/workspace/PTY tests plus real temporary-repository execution |
| GRAPH-06 / planned | S3 Task 6 (394): `server/src/graph-run/orchestrator.ts`, `recovery.ts`, `server/src/app.ts` | GRAPH-04/05 | Immutable run dispatch, retry attempts preserve prior artifacts, crash yields interrupted not succeeded, no double dispatch. `graph-run/orchestrator.test.ts`, `recovery.test.ts` |
| GRAPH-07 / planned | S3 Task 7 (455): `server/src/graph-run/integration-service.ts`, `delivery-service.ts`, `server/src/verification/verification-service.ts`, graph orchestrator | GRAPH-06 | Explicit integration worktree, conflicts visible, integrated checks bound to diff/commit, fresh separate approval, replay protection, active dirty checkout unchanged. Integration/delivery/verification tests in temporary real Git repositories |
| GRAPH-08 / stage gate | S3 Task 8 (517): `server/src/graph/index.ts`, `server/src/graph-run/index.ts`, `server/src/app.ts`, `server/src/runs/index.ts` | GRAPH-03/06/07 | Validated/authenticated routes, stale-revision errors, replayable events, approved run and local delivery through real TCP APIs. `graph/index.test.ts`, `graph-run/index.test.ts` and complete server suite |

**M4 gate:** all S3 exit criteria, standard server build/tests including hooks, actual TCP authentication/path constraints, fake-agent execution in real isolated worktrees, event replay, and kill/restart during execution/verification/integration. Verify no active-checkout modification or lost attempt evidence. Planning unit tests may run independently, but no graph execution integration is accepted before Stage 2 exit and native readiness.

## 9. Stage 4 task backlog, preserving existing UX plan

| ID / priority | Existing task and exact targets | Dependencies / parallelism | Acceptance and regression focus |
|---|---|---|---|
| UI-01 / planned | S4 Task 1 (38): `src/store/graph-store.ts`, `graph-run-store.ts`, `src/hooks/useGraphRunSocket.ts`, `src/types/graph.ts`, `src/types/run.ts` | GRAPH-08 | Server-authoritative state, revision conflicts, event dedup/replay and reconnect. `graph-store.test.ts`, `graph-run-store.test.ts`, existing run-store tests |
| UI-02 / planned | S4 Task 2 (99): `src/features/graph/graph-layout.ts`, `GraphCanvas.tsx`, `GraphNodeView.tsx`, `GraphEdgeView.tsx`, `graph.css` | UI-01 | Deterministic layout, collapsible feature groups, keyboard navigation and non-color status. `graph-layout.test.ts`, `graph-canvas.test.tsx` |
| UI-03 / planned | S4 Task 3 (161): `src/features/graph/GraphInspector.tsx`, `GraphValidationPanel.tsx`, `GraphApprovalDialog.tsx`, graph canvas/store | UI-02 | Editable typed draft, actionable validation, commands/scopes/approval preview, edits do not mutate active snapshot. `graph-editor.test.tsx` |
| UI-04 / planned | S4 Task 4 (223): `src/features/evidence/EvidenceDrawer.tsx`, `AttemptTerminal.tsx`, `AttemptDiff.tsx`, `AttemptChecks.tsx`, `AttemptArtifacts.tsx`, `AttemptEvents.tsx`, `evidence.css`, existing `src/panels/terminal/useTerminal.ts` | UI-01, FIX-06; can parallel UI-03 with separate files | Node/attempt-owned streams, historical attempts, truthful checks/artifacts/errors, no old input subscriptions. `evidence-drawer.test.tsx`, run component tests plus live fake-agent browser run |
| UI-05 / planned | S4 Task 5 (280): `src/features/review/GraphReviewWorkspace.tsx`, `IntegratedDiffSummary.tsx`, `VerificationSummary.tsx`, `DeliveryApprovalDialog.tsx`, `src/panels/review/ReviewPanel.tsx`, graph-run store | UI-01/04, GRAPH-07 | Integrated diff/check identity and residual risks, explicit local delivery consent, stale/replayed approvals blocked. `graph-review.test.tsx` and real public-interface delivery |
| UI-06 / planned | S4 Task 6 (341): `src/components/StudioShell.tsx`, `ProjectRail.tsx`, `ModeSwitcher.tsx`, `NodeInspectorPane.tsx`, existing App/RuntimeApp/AppShell/Sidebar/CommandPalette/LayoutEngine, `src/index.css`, `src/types/panel.ts` | UI-03/04/05, PLAN-03 | Plan/Run/Review primary workflow, graph owns run state, existing useful projections retained, deferred prototype modules hidden not rewritten. `studio-shell.test.tsx` and all feature interaction tests |
| UI-07 / release gate | S4 Task 7 (412): `e2e/fixtures/fake-agent.ts`, `e2e/specs/local-graph-mvp.spec.ts`, `e2e-desktop/wdio.conf.ts`, `e2e-desktop/specs/local-graph-mvp.desktop.ts`, `scripts/desktop-golden-path.mjs`, `docs/testing/local-graph-mvp.md`, `playwright.config.ts`, manifests/locks, Tauri feature setup, `.github/workflows/ci.yml`, `README.md` | UI-06, PRE-03 dependency approval | New/existing project full packaged journeys, failure/cancel/retry/recovery, secure feature-gated desktop automation absent from release binary |

`desktop:golden-path` is **planned in UI-07 and does not currently exist**. Implement and validate that script before treating it as runnable. Its absence now is planned scope, not a broken current script. Preserve production bundle isolation from verification plugins and feature flags.

## 10. Integration, rollout and rollback sequencing

1. **Baseline and authorization:** retain dirty root and inspect newer branch through explicit metadata, obtain a safe execution location. A coordinator may publish documentation separately, but that does not authorize production implementation.
2. **One persistence unit:** test red, repair hydration/destination/echoes, include supported CORS methods, run GATE-01. Review the entire diff together. Do not deploy partial transport enablement. No schema migration is intended for this batch.
3. **Foundation acceptance:** user resolves native prerequisites, reproduce terminal behavior, rebuild packages and pass GATE-02. Persist environment evidence separately from source fixes.
4. **Finish Stage 2:** complete UI on existing backend and prove one complete definition journey before graph work. Reconcile any old plan pseudocode against implemented route types in a focused review, not a speculative redesign.
5. **Stage 3 after sponsor go:** integrate domain/storage, planner/scheduler, execution/recovery, integration/delivery, APIs in dependency order. Portable migration must preserve old bytes and history and have documented recovery behavior. Do not combine it with unrelated config cleanup.
6. **Stage 4:** integrate stores, graph editing, evidence, review, shell, then packaged acceptance. Keep each task independently reviewable. Branch suggestions after the first fix are `fix/terminal-lifecycle`, `feat/project-interview-ui`, `feat/graph-runtime`, `feat/graph-experience`, each based on approved predecessor changes. Follow existing stage sequence even if internal task coding overlaps.
7. **Rollout:** first exercise disposable fixtures and a clean test account, then an explicitly approved non-production pilot repository with preserved dirty-state baseline. Only after all relevant gates should a user decide integration/distribution. No automatic release/tag or invented schedule.
8. **If a regression appears:** stop integration/distribution, preserve traces and portable data, and prepare a focused fix. If reverting is needed, obtain authorization and revert the coordinated persistence unit rather than retaining CORS while removing safety fixes. Never reset/stash/clean user work. Restore data only from user-approved verified backups, not inferred default state.

## 11. Risks and mitigations

| Risk | Mitigation / stop condition |
|---|---|
| CORS repair unlocks previously blocked incorrect writes | Single persistence release gate with URL/payload and disk assertions |
| Global syncing guard hides legitimate edits | Per-slice remote application and request ordering tests, concurrent-edit regression |
| Slow hydration or scene responses replace current state | Explicit readiness, request ownership, delayed-response tests |
| Existing test harness talks to developer runtime | Fresh isolated project/token/ports, owned process teardown, no reused servers for acceptance |
| Old branch defects distract from current scope | Preserve newer auth/traversal tests, do not rebuild already working boundaries |
| Native environment failures counted as source failures | Separate prerequisites and standard-hook results, no claims from bypassed commands |
| Stale bundle masks missing current resources | Fresh source/artifact provenance plus actual package lifecycle |
| Old stage anchors omit RuntimeApp | Trace current mount and actual route contracts before each task |
| Graph expansion outruns product evidence | Explicit sponsor gate, use existing narrow golden paths and local qualitative validation |
| New dependencies or graph framework expand scope | No production additions, explicit approval for test-only desktop tooling |
| Graph claims success without verified integration | Evidence tied to exact attempt/diff, immutable snapshots, separate approvals and stale-evidence checks |
| Existing user data or dirty work lost | Read-only baseline, temporary repos, atomic/recovery-backed migrations, no active-tree side effects |

## 12. Definition of done and evidence handoff

A task is done only when its acceptance behavior is observed at the stated boundary, tests and affected regression suites run against the changed source, documentation reflects behavior, and reviewer concerns are resolved. A blocked check is not a pass. Tests that were not discovered are not coverage. Unit mocks do not substitute for real browser CORS, real native PTY, real Git integration, or fresh packaged lifecycle.

**Program completion requires:**

- [ ] Coordinated persistence repair passes reload, destination and autosave browser gates, including actual on-disk state.
- [ ] Native terminal operation and current package runtime startup/authentication/shutdown are proved.
- [ ] New and existing repositories reach a confirmed portable sourced definition through quick/guided/import flows.
- [ ] Approved graph execution changes real readiness, isolates nodes, retains retry/recovery evidence, integrates and verifies the combined result.
- [ ] Plan/Run/Review surfaces reflect server authority, remain keyboard accessible, and never present failed communication or unchecked output as success.
- [ ] Packaged new/existing-project golden paths pass with deterministic fake CLIs. Both installed/authenticated real CLI paths receive user-approved manual smoke coverage.
- [ ] Fresh `npm run check:full`, desktop scripts, Cargo format/test/clippy, production/verification builds, absolute-path bundle verification, and the newly implemented packaged golden-path command pass, with no unexplained skipped core cases.
- [ ] Clean-account/no-system-Node release behavior and absence of test plugins in the production bundle are verified.
- [ ] All changed outputs map to retained evidence, source/artifact identity, test commands, observed results and known limitations. No secrets, runtime state or unrelated files are staged.
- [ ] User explicitly decides integration/distribution. No commit/push/release is implied by a passing gate.

**Evidence record per task:** task ID, exact source baseline/diff, command and exit code, fixture/runtime description, assertions proved, artifact paths, failures/skips with reason and owner, follow-up decision. Keep screenshots, request logs and temporary project artifacts local and redacted.

## 13. Immediate handoff: first approved execution session

Execute in this concrete order, without starting graph features:

1. PRE-01: confirm authorization, safe newer-base location and Git/environment limits. Do not replay historical branch setup.
2. FIX-01: add failing unit and real Chromium regressions for the three confirmed persistence failures, using scratch project fixtures.
3. FIX-02 and FIX-03: settle the remote-application/workspace-ownership boundary and implement hydration/default and destination safety.
4. FIX-04: suppress canonical/rollback echoes while retaining legitimate concurrent user changes.
5. FIX-05: include supported CORS methods within the same unshipped integration batch.
6. GATE-01: run focused suites, lint/build and all real-browser/public-interface checks. Stop on wrong-target write, unintended reseed or request growth.
7. Record PRE-02 unresolved actions for the user. Continue INV-01 diagnosis in parallel if useful, but do not claim native/package acceptance or begin Stage 3.
8. Request review of the coordinated batch and evidence before any integration action. Next feature priority after foundation acceptance is S2 Task 6, not a new graph design.

**Recommended decision now:** approve planning scope and the persistence-first batch for a later implementation session, retain the existing stage contracts, and keep native prerequisites and graph investment approval explicit. This plan itself performs no implementation.
