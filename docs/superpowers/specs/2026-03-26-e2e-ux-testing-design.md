# E2E UX Testing — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Approach:** Playwright + Page Object Model + `data-testid` attributes

---

## Problem

The existing Playwright suite (41 tests across `smoke.spec.ts`, `features.spec.ts`, `full-suite.spec.ts`) has two problems:

1. **UI mode shows no tests** unless both dev servers are already running — the `webServer` config blocks UI initialization.
2. **Most tests fail** — they rely on CSS class selectors (`.topbar`, `.sidebar`, `.statusbar`) that have drifted from the actual component markup during the v0.2.0 sprint.

Fixing selectors one by one is not viable. The suite needs a stable foundation.

---

## Design

### Approach: Page Object Model + `data-testid`

Each major UI area becomes a Page Object class that encapsulates all selectors and actions for that area. Tests call methods (`await kanban.addCard('Fix login')`) rather than raw Playwright locators. When component markup changes, only the POM file needs updating — not every test that touches it.

Selectors are anchored to `data-testid` attributes added to source components. These are invisible to users and immune to CSS class renames.

---

## File Layout

```
e2e/
  fixtures/
    index.ts              # Custom Playwright fixtures
  pages/
    OnboardingPage.ts
    AppShell.ts
    CommandPalette.ts
    PanelManager.ts
    KanbanPage.ts
    CompanionPage.ts
    TerminalPage.ts
    SparkCanvasPage.ts
  specs/
    onboarding.spec.ts
    shell.spec.ts
    panels.spec.ts
    kanban.spec.ts
    companion.spec.ts
    terminal.spec.ts      # @pty tag — excluded from CI
    regression.spec.ts
```

The existing `smoke.spec.ts`, `features.spec.ts`, and `full-suite.spec.ts` are deleted.

---

## Fixtures

`e2e/fixtures/index.ts` exports two base fixtures used by all specs:

- **`appPage`** — sets `localStorage` via `addInitScript` to mark onboarding complete, navigates to `/`, waits for `[data-testid="layout-engine"]` to be visible.
- **`appWithPanels`** — extends `appPage`, also seeds one terminal + one kanban panel via the config API before navigation.

---

## `data-testid` Attributes

Added to ~15 source components. No logic or styling changes — attributes only.

### App Shell
| Attribute | Component |
|---|---|
| `topbar` | `TopBar.tsx` |
| `topbar-title` | `TopBar.tsx` |
| `sidebar` | `Sidebar.tsx` |
| `sidebar-toggle` | `Sidebar.tsx` |
| `statusbar` | `StatusBar.tsx` |
| `statusbar-connection` | `StatusBar.tsx` |
| `statusbar-vibe-score` | `StatusBar.tsx` |

### Panels
| Attribute | Component |
|---|---|
| `layout-engine` | `LayoutEngine.tsx` |
| `panel` | `Panel.tsx` (every panel wrapper) |
| `panel-terminal` | `Panel.tsx` (when type=terminal) |
| `panel-kanban` | `Panel.tsx` (when type=kanban) |
| `panel-companion` | `Panel.tsx` (when type=companion) |
| `panel-spark` | `Panel.tsx` (when type=spark) |
| `panel-header` | `Panel.tsx` |
| `panel-close` | `Panel.tsx` |

### Kanban
| Attribute | Component |
|---|---|
| `kanban-board` | `KanbanBoard.tsx` |
| `kanban-column-idea` | `KanbanBoard.tsx` |
| `kanban-column-specced` | `KanbanBoard.tsx` |
| `kanban-column-in-agent` | `KanbanBoard.tsx` |
| `kanban-column-done` | `KanbanBoard.tsx` |
| `kanban-card` | `KanbanBoard.tsx` (every card) |
| `kanban-add-card` | `KanbanBoard.tsx` |
| `kanban-send-to-agent` | `KanbanBoard.tsx` |
| `brain-dump-input` | `BrainDumpInput.tsx` |

### Companion / Terminal / Command Palette
| Attribute | Component |
|---|---|
| `companion-input` | `CompanionPanel.tsx` |
| `companion-send` | `CompanionPanel.tsx` |
| `companion-message` | `CompanionPanel.tsx` (every message bubble) |
| `terminal-container` | `TerminalPanel.tsx` |
| `quick-prompt-input` | `QuickPromptBar.tsx` |
| `command-palette` | `CommandPalette.tsx` |
| `command-palette-input` | `CommandPalette.tsx` |
| `command-palette-item` | `CommandPalette.tsx` (every result row) |

### Onboarding
| Attribute | Component |
|---|---|
| `onboarding-overlay` | `OnboardingWizard.tsx` |
| `onboarding-step` | `OnboardingWizard.tsx` |
| `onboarding-next` | `OnboardingWizard.tsx` |
| `onboarding-skip` | `OnboardingWizard.tsx` |
| `onboarding-back` | `OnboardingWizard.tsx` |

---

## Test Coverage

### `onboarding.spec.ts`
- First visit shows wizard overlay
- Can step through all steps with Next/Back
- Skip button lands on app shell with panels seeded
- Completing wizard persists `isComplete` to localStorage
- Re-visiting after completion bypasses wizard

### `shell.spec.ts`
- TopBar renders with correct title
- Sidebar collapses and expands, state persists across reload
- StatusBar shows connection status
- Command palette opens with `Cmd+K`, filters results by query, executes an action, closes with `Escape`
- Scene switcher swaps workspaces

### `panels.spec.ts`
- Default panels render after onboarding
- Panel closes via header button
- Panel can be added from sidebar or command palette
- Panel drag repositions within grid
- Panel resize updates dimensions
- Error boundary catches a bad panel without crashing the shell

### `kanban.spec.ts`
- Board renders all 4 columns
- Card can be created via "Add card"
- Brain dump input creates cards (companion AI response is mocked via `page.route()` for this test only)
- Card can be dragged between columns
- "Send to Agent" dispatches card context to active terminal session and sets card status to "In Agent"

### `companion.spec.ts`
- Panel shows input field
- Sending a message appends it to the thread
- Response streams in — at least one assistant message bubble appears
- Model selection from config is reflected in the panel

### `terminal.spec.ts` *(tagged `@pty` — excluded from CI)*
- Terminal panel renders xterm canvas
- Typing a command sends it to PTY
- Output appears in terminal
- New session can be spawned from session list
- Quick Prompt Bar injects text into active session

### `regression.spec.ts`
- Full flow: onboarding → shell → open kanban → create card → send to agent → terminal receives context bundle
- Companion chat → config change action → layout updates to reflect change

---

## CI Configuration

`terminal.spec.ts` is excluded from CI runs via a Playwright tag grep. All other specs run in CI against servers started by the `webServer` config.

```ts
// playwright.config.ts — CI project
{
  name: 'chromium-ci',
  grepInvert: /@pty/,    // exclude terminal tests
  use: { ...devices['Desktop Chrome'] },
}
```

Local runs can include terminal tests by running all projects or targeting `terminal.spec.ts` directly.

---

## Out of Scope

- Visual regression / screenshot diffing
- Accessibility audits
- Mobile/responsive testing
- Load or performance testing
