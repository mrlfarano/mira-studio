# E2E UX Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the failing 41-test Playwright suite with a stable Page Object Model suite using `data-testid` selectors, covering onboarding, shell, panels, kanban, companion, terminal (local only), and end-to-end regression flows.

**Architecture:** Add `data-testid` attributes to ~15 source components (attribute-only, no logic changes), create Page Object classes in `e2e/pages/`, shared fixtures in `e2e/fixtures/index.ts`, and spec files in `e2e/specs/`. The old `e2e/*.spec.ts` files at the root are deleted.

**Tech Stack:** Playwright 1.58.2, TypeScript, Vitest (unchanged), React 19 source components

---

## File Map

**Modified source files (data-testid only):**
- `src/components/TopBar.tsx`
- `src/components/Sidebar.tsx`
- `src/components/StatusBar.tsx`
- `src/panels/Panel.tsx`
- `src/components/LayoutEngine.tsx`
- `src/components/CommandPalette.tsx`
- `src/components/OnboardingWizard.tsx`
- `src/components/BrainDumpInput.tsx`
- `src/panels/kanban/KanbanBoard.tsx`
- `src/panels/kanban/KanbanColumn.tsx`
- `src/panels/kanban/KanbanCard.tsx`
- `src/panels/companion/CompanionPanel.tsx`
- `src/panels/terminal/TerminalPanel.tsx`
- `src/components/QuickPromptBar.tsx`

**Modified config:**
- `playwright.config.ts` — add `grepInvert` for CI, restructure projects

**New test infrastructure:**
- `e2e/fixtures/index.ts` — `appPage` and `appWithPanels` fixtures
- `e2e/pages/OnboardingPage.ts`
- `e2e/pages/AppShell.ts`
- `e2e/pages/CommandPalette.ts`
- `e2e/pages/PanelManager.ts`
- `e2e/pages/KanbanPage.ts`
- `e2e/pages/CompanionPage.ts`
- `e2e/pages/TerminalPage.ts`
- `e2e/pages/SparkCanvasPage.ts`

**New spec files:**
- `e2e/specs/onboarding.spec.ts`
- `e2e/specs/shell.spec.ts`
- `e2e/specs/panels.spec.ts`
- `e2e/specs/kanban.spec.ts`
- `e2e/specs/companion.spec.ts`
- `e2e/specs/terminal.spec.ts`
- `e2e/specs/regression.spec.ts`

**Deleted:**
- `e2e/smoke.spec.ts`
- `e2e/features.spec.ts`
- `e2e/full-suite.spec.ts`

---

## Task 1: Update playwright.config.ts

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: Update the config**

Replace the entire file with:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      grepInvert: process.env.CI ? /@pty/ : undefined,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run server',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
})
```

The key changes: `reuseExistingServer: true` (unconditional, no `!process.env.CI`) so Playwright never tries to auto-start servers in any context — you start them manually. `grepInvert: /@pty/` in CI excludes terminal tests.

- [ ] **Step 2: Create the e2e subdirectories**

```bash
mkdir -p e2e/fixtures e2e/pages e2e/specs
```

- [ ] **Step 3: Verify Playwright can list tests (servers must be running)**

```bash
npx playwright test --list
```

Expected: 41 tests listed (old suite still intact at this point).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts
git commit -m "test: update playwright config — reuseExistingServer + CI grepInvert"
```

---

## Task 2: Add data-testid to App Shell (TopBar, Sidebar, StatusBar)

**Files:**
- Modify: `src/components/TopBar.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/StatusBar.tsx`

- [ ] **Step 1: Update TopBar.tsx**

Change line 11 from:
```tsx
    <header className="topbar">
```
to:
```tsx
    <header className="topbar" data-testid="topbar">
```

Change line 13 from:
```tsx
        <span className="topbar__logo">Mira Studio</span>
```
to:
```tsx
        <span className="topbar__logo" data-testid="topbar-title">Mira Studio</span>
```

- [ ] **Step 2: Update Sidebar.tsx**

Change line 37 from:
```tsx
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
```
to:
```tsx
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} data-testid="sidebar">
```

Change line 38–43 (the toggle button) from:
```tsx
      <button
        className="sidebar__toggle"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
```
to:
```tsx
      <button
        className="sidebar__toggle"
        data-testid="sidebar-toggle"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
```

- [ ] **Step 3: Update StatusBar.tsx**

Change line 189 from:
```tsx
    <footer className="statusbar">
```
to:
```tsx
    <footer className="statusbar" data-testid="statusbar">
```

Change line 191–195 (connection indicator span) from:
```tsx
        <span className="statusbar__indicator statusbar__indicator--connection">
```
to:
```tsx
        <span className="statusbar__indicator statusbar__indicator--connection" data-testid="statusbar-connection">
```

Change line 233–250 (the vibe score button) from:
```tsx
          <button
            onClick={openVibePanel}
            className="statusbar__indicator statusbar__indicator--vibe"
```
to:
```tsx
          <button
            onClick={openVibePanel}
            data-testid="statusbar-vibe-score"
            className="statusbar__indicator statusbar__indicator--vibe"
```

- [ ] **Step 4: Run lint to confirm no issues**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx src/components/Sidebar.tsx src/components/StatusBar.tsx
git commit -m "test: add data-testid to TopBar, Sidebar, StatusBar"
```

---

## Task 3: Add data-testid to Panel.tsx and LayoutEngine.tsx

**Files:**
- Modify: `src/panels/Panel.tsx`
- Modify: `src/components/LayoutEngine.tsx`

- [ ] **Step 1: Update Panel.tsx**

The outer div on line 47 currently reads:
```tsx
    <div
      className="panel"
      style={{ zIndex, display: 'flex', flexDirection: 'column', height: '100%' }}
      onMouseDown={handleMouseDown}
    >
```
Change to:
```tsx
    <div
      className="panel"
      data-testid={`panel-${type}`}
      style={{ zIndex, display: 'flex', flexDirection: 'column', height: '100%' }}
      onMouseDown={handleMouseDown}
    >
```

The header div on line 53 currently reads:
```tsx
      <div
        className="panel-header drag-handle"
```
Change to:
```tsx
      <div
        className="panel-header drag-handle"
        data-testid="panel-header"
```

The close button on line 77 currently reads:
```tsx
          <button
            onClick={handleClose}
            aria-label="Close panel"
            style={btnStyle}
          >
```
Change to:
```tsx
          <button
            onClick={handleClose}
            data-testid="panel-close"
            aria-label="Close panel"
            style={btnStyle}
          >
```

- [ ] **Step 2: Update LayoutEngine.tsx**

Line 115 currently reads:
```tsx
    <div ref={containerRef} style={{ width: '100%', minHeight: '100vh' }}>
```
Change to:
```tsx
    <div ref={containerRef} data-testid="layout-engine" style={{ width: '100%', minHeight: '100vh' }}>
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/panels/Panel.tsx src/components/LayoutEngine.tsx
git commit -m "test: add data-testid to Panel and LayoutEngine"
```

---

## Task 4: Add data-testid to CommandPalette.tsx

**Files:**
- Modify: `src/components/CommandPalette.tsx`

- [ ] **Step 1: Add testid to the container div**

Line 493–496 currently reads:
```tsx
      <div
        style={styles.container}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
```
Change to:
```tsx
      <div
        data-testid="command-palette"
        style={styles.container}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
```

- [ ] **Step 2: Add testid to the input**

Line 498–506 currently reads:
```tsx
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="Type a command..."
```
Change to:
```tsx
        <input
          ref={inputRef}
          data-testid="command-palette-input"
          style={styles.input}
          placeholder="Type a command..."
```

- [ ] **Step 3: Add testid to each command item**

Line 519–521 currently reads:
```tsx
                  <div
                    key={cmd.id}
                    data-active={isActive}
```
Change to:
```tsx
                  <div
                    key={cmd.id}
                    data-testid="command-palette-item"
                    data-active={isActive}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CommandPalette.tsx
git commit -m "test: add data-testid to CommandPalette"
```

---

## Task 5: Add data-testid to OnboardingWizard.tsx

**Files:**
- Modify: `src/components/OnboardingWizard.tsx`

- [ ] **Step 1: Add testid to the overlay**

Line 207 currently reads:
```tsx
    <div className="onboarding-overlay">
```
Change to:
```tsx
    <div className="onboarding-overlay" data-testid="onboarding-overlay">
```

- [ ] **Step 2: Add testid to the skip button**

Line 210–214 currently reads:
```tsx
        <button
          className="onboarding-wizard__skip"
          onClick={handleSkip}
          type="button"
        >
```
Change to:
```tsx
        <button
          className="onboarding-wizard__skip"
          data-testid="onboarding-skip"
          onClick={handleSkip}
          type="button"
        >
```

- [ ] **Step 3: Add testid to the step content div**

Line 222 currently reads:
```tsx
          <div className="onboarding-wizard__content" key={currentStep}>
```
Change to:
```tsx
          <div className="onboarding-wizard__content" data-testid="onboarding-step" key={currentStep}>
```

- [ ] **Step 4: Add testid to the back button**

Line 241–247 currently reads:
```tsx
          {currentStep > 0 && (
            <button
              className="onboarding-wizard__btn onboarding-wizard__btn--back"
              onClick={handleBack}
              type="button"
            >
```
Change to:
```tsx
          {currentStep > 0 && (
            <button
              className="onboarding-wizard__btn onboarding-wizard__btn--back"
              data-testid="onboarding-back"
              onClick={handleBack}
              type="button"
            >
```

- [ ] **Step 5: Add testid to the next/finish button**

Line 250–253 currently reads:
```tsx
          <button
            className="onboarding-wizard__btn onboarding-wizard__btn--next"
            onClick={handleNext}
            type="button"
```
Change to:
```tsx
          <button
            className="onboarding-wizard__btn onboarding-wizard__btn--next"
            data-testid="onboarding-next"
            onClick={handleNext}
            type="button"
```

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/OnboardingWizard.tsx
git commit -m "test: add data-testid to OnboardingWizard"
```

---

## Task 6: Add data-testid to Kanban components

**Files:**
- Modify: `src/panels/kanban/KanbanBoard.tsx`
- Modify: `src/panels/kanban/KanbanColumn.tsx`
- Modify: `src/panels/kanban/KanbanCard.tsx`
- Modify: `src/components/BrainDumpInput.tsx`

- [ ] **Step 1: Update KanbanBoard.tsx**

The outer board div on line 109 currently reads:
```tsx
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
```
Change to:
```tsx
    <div
      data-testid="kanban-board"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
```

The Brain Dump button (line 130–143) currently reads:
```tsx
        <button
          onClick={openBrainDump}
          style={{...}}
        >
          Brain Dump
        </button>
```
Change to:
```tsx
        <button
          data-testid="brain-dump-trigger"
          onClick={openBrainDump}
          style={{...}}
        >
          Brain Dump
        </button>
```

- [ ] **Step 2: Update KanbanColumn.tsx**

The outer column div on line 36 currently reads:
```tsx
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{...}}
    >
```
Change to:
```tsx
    <div
      data-testid={`kanban-column-${columnId}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{...}}
    >
```

- [ ] **Step 3: Update KanbanCard.tsx**

The outer draggable div on line 212 currently reads:
```tsx
    <div
      draggable
      onDragStart={handleDragStart}
      style={{...}}
    >
```
Change to:
```tsx
    <div
      draggable
      data-testid="kanban-card"
      onDragStart={handleDragStart}
      style={{...}}
    >
```

The Send to Agent button on line 277 currently reads:
```tsx
        <button
          disabled={disabled}
          style={{...}}
          onClick={handleSendClick}
        >
```
Change to:
```tsx
        <button
          data-testid="kanban-send-to-agent"
          disabled={disabled}
          style={{...}}
          onClick={handleSendClick}
        >
```

- [ ] **Step 4: Update BrainDumpInput.tsx**

The textarea on line 206 currently reads:
```tsx
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste your notes..."
```
Change to:
```tsx
                <textarea
                  data-testid="brain-dump-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste your notes..."
```

The Generate Cards button on line 324 currently reads:
```tsx
            <button
              onClick={handleGenerate}
              disabled={!text.trim()}
              style={{...}}
            >
              Generate Cards
            </button>
```
Change to:
```tsx
            <button
              data-testid="brain-dump-generate"
              onClick={handleGenerate}
              disabled={!text.trim()}
              style={{...}}
            >
              Generate Cards
            </button>
```

The "Add X Cards to Idea" confirm button on line 363 currently reads:
```tsx
              <button
                onClick={handleConfirm}
                disabled={selectedIndices.size === 0}
```
Change to:
```tsx
              <button
                data-testid="brain-dump-confirm"
                onClick={handleConfirm}
                disabled={selectedIndices.size === 0}
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/panels/kanban/KanbanBoard.tsx src/panels/kanban/KanbanColumn.tsx src/panels/kanban/KanbanCard.tsx src/components/BrainDumpInput.tsx
git commit -m "test: add data-testid to Kanban components and BrainDumpInput"
```

---

## Task 7: Add data-testid to CompanionPanel, TerminalPanel, QuickPromptBar

**Files:**
- Modify: `src/panels/companion/CompanionPanel.tsx`
- Modify: `src/panels/terminal/TerminalPanel.tsx`
- Modify: `src/components/QuickPromptBar.tsx`

- [ ] **Step 1: Update CompanionPanel.tsx**

The input on line 198 currently reads:
```tsx
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Mira..."
```
Change to:
```tsx
        <input
          ref={inputRef}
          data-testid="companion-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Mira..."
```

The Send button on line 216 currently reads:
```tsx
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isStreaming}
          aria-label="Send message"
```
Change to:
```tsx
        <button
          data-testid="companion-send"
          onClick={handleSend}
          disabled={!inputValue.trim() || isStreaming}
          aria-label="Send message"
```

- [ ] **Step 2: Add testid to CompanionMessage**

Open `src/panels/companion/CompanionMessage.tsx`. Find the outer container element of the component (whatever wraps each message bubble) and add `data-testid="companion-message"` to it.

- [ ] **Step 3: Update TerminalPanel.tsx**

The xterm container div on line 239 currently reads:
```tsx
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "2px 4px",
        }}
      />
```
Change to:
```tsx
      <div
        ref={containerRef}
        data-testid="terminal-container"
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "2px 4px",
        }}
      />
```

- [ ] **Step 4: Update QuickPromptBar.tsx**

The input on line 244 currently reads:
```tsx
          <input
            ref={inputRef}
            style={styles.input}
            placeholder={...}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!targetSession}
          />
```
Change to:
```tsx
          <input
            ref={inputRef}
            data-testid="quick-prompt-input"
            style={styles.input}
            placeholder={...}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!targetSession}
          />
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/panels/companion/CompanionPanel.tsx src/panels/terminal/TerminalPanel.tsx src/components/QuickPromptBar.tsx
git commit -m "test: add data-testid to CompanionPanel, TerminalPanel, QuickPromptBar"
```

---

## Task 8: Create e2e/fixtures/index.ts

**Files:**
- Create: `e2e/fixtures/index.ts`

- [ ] **Step 1: Write the fixture file**

```ts
import { test as base, expect } from '@playwright/test'

type MiraFixtures = {
  appPage: void
  appWithPanels: void
}

export const test = base.extend<MiraFixtures>({
  appPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="layout-engine"]', { timeout: 10000 })
    await use()
  },

  appWithPanels: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="layout-engine"]', { timeout: 10000 })
    // Open kanban via command palette
    await page.keyboard.press('Meta+k')
    await page.waitForSelector('[data-testid="command-palette"]', { timeout: 5000 })
    await page.fill('[data-testid="command-palette-input"]', 'kanban')
    await page.keyboard.press('Enter')
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 8000 })
    await use()
  },
})

export { expect }
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors related to e2e/fixtures/index.ts.

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures/index.ts
git commit -m "test: add Playwright fixtures (appPage, appWithPanels)"
```

---

## Task 9: Create Page Objects — OnboardingPage and AppShell

**Files:**
- Create: `e2e/pages/OnboardingPage.ts`
- Create: `e2e/pages/AppShell.ts`

- [ ] **Step 1: Write OnboardingPage.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class OnboardingPage {
  readonly overlay: Locator
  readonly skipButton: Locator
  readonly nextButton: Locator
  readonly backButton: Locator
  readonly step: Locator

  constructor(readonly page: Page) {
    this.overlay = page.getByTestId('onboarding-overlay')
    this.skipButton = page.getByTestId('onboarding-skip')
    this.nextButton = page.getByTestId('onboarding-next')
    this.backButton = page.getByTestId('onboarding-back')
    this.step = page.getByTestId('onboarding-step')
  }

  async waitForVisible() {
    await this.overlay.waitFor({ state: 'visible' })
  }

  async skip() {
    await this.skipButton.click()
    await this.overlay.waitFor({ state: 'hidden' })
  }

  async fillCurrentStep(text: string) {
    await this.step.locator('input').fill(text)
  }

  async clickNext() {
    await this.nextButton.click()
  }

  async clickBack() {
    await this.backButton.click()
  }

  async completeAllSteps() {
    await this.fillCurrentStep('A React web app')
    await this.clickNext()
    await this.fillCurrentStep('Minimal and focused')
    await this.clickNext()
    await this.fillCurrentStep('Git, VS Code')
    await this.clickNext()
    // Step 4 is optional — click Finish
    await this.clickNext()
    await this.overlay.waitFor({ state: 'hidden' })
  }
}
```

- [ ] **Step 2: Write AppShell.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class AppShell {
  readonly topbar: Locator
  readonly topbarTitle: Locator
  readonly sidebar: Locator
  readonly sidebarToggle: Locator
  readonly statusbar: Locator
  readonly statusbarConnection: Locator
  readonly layoutEngine: Locator

  constructor(readonly page: Page) {
    this.topbar = page.getByTestId('topbar')
    this.topbarTitle = page.getByTestId('topbar-title')
    this.sidebar = page.getByTestId('sidebar')
    this.sidebarToggle = page.getByTestId('sidebar-toggle')
    this.statusbar = page.getByTestId('statusbar')
    this.statusbarConnection = page.getByTestId('statusbar-connection')
    this.layoutEngine = page.getByTestId('layout-engine')
  }

  async waitForReady() {
    await this.layoutEngine.waitFor({ state: 'visible', timeout: 10000 })
  }

  async toggleSidebar() {
    await this.sidebarToggle.click()
  }

  async isSidebarCollapsed(): Promise<boolean> {
    const cls = (await this.sidebar.getAttribute('class')) ?? ''
    return cls.includes('sidebar--collapsed')
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/OnboardingPage.ts e2e/pages/AppShell.ts
git commit -m "test: add OnboardingPage and AppShell page objects"
```

---

## Task 10: Create Page Objects — CommandPalette and PanelManager

**Files:**
- Create: `e2e/pages/CommandPalette.ts`
- Create: `e2e/pages/PanelManager.ts`

- [ ] **Step 1: Write CommandPalette.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class CommandPalettePage {
  readonly palette: Locator
  readonly input: Locator

  constructor(readonly page: Page) {
    this.palette = page.getByTestId('command-palette')
    this.input = page.getByTestId('command-palette-input')
  }

  async open() {
    await this.page.keyboard.press('Meta+k')
    await this.palette.waitFor({ state: 'visible', timeout: 3000 })
  }

  async close() {
    await this.page.keyboard.press('Escape')
    await this.palette.waitFor({ state: 'hidden', timeout: 3000 })
  }

  async search(query: string) {
    await this.input.fill(query)
  }

  async execute(label: string) {
    await this.search(label)
    await this.page
      .getByTestId('command-palette-item')
      .filter({ hasText: label })
      .first()
      .click()
  }

  async isOpen(): Promise<boolean> {
    return this.palette.isVisible()
  }
}
```

- [ ] **Step 2: Write PanelManager.ts**

```ts
import { type Page, type Locator } from '@playwright/test'
import { CommandPalettePage } from './CommandPalette'

export class PanelManager {
  private readonly commandPalette: CommandPalettePage

  constructor(readonly page: Page) {
    this.commandPalette = new CommandPalettePage(page)
  }

  allPanels(): Locator {
    return this.page.locator('[data-testid^="panel-"]')
  }

  panelByType(type: string): Locator {
    return this.page.getByTestId(`panel-${type}`)
  }

  async closePanel(type: string) {
    const panel = this.panelByType(type)
    await panel.getByTestId('panel-close').click()
  }

  async openPanelViaCommand(commandLabel: string) {
    await this.commandPalette.open()
    await this.commandPalette.execute(commandLabel)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add e2e/pages/CommandPalette.ts e2e/pages/PanelManager.ts
git commit -m "test: add CommandPalette and PanelManager page objects"
```

---

## Task 11: Create Page Object — KanbanPage

**Files:**
- Create: `e2e/pages/KanbanPage.ts`

- [ ] **Step 1: Write KanbanPage.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class KanbanPage {
  readonly board: Locator

  constructor(readonly page: Page) {
    this.board = page.getByTestId('kanban-board')
  }

  column(id: 'idea' | 'specced' | 'in-agent' | 'done'): Locator {
    return this.page.getByTestId(`kanban-column-${id}`)
  }

  cards(): Locator {
    return this.page.getByTestId('kanban-card')
  }

  cardsInColumn(id: 'idea' | 'specced' | 'in-agent' | 'done'): Locator {
    return this.column(id).getByTestId('kanban-card')
  }

  async openBrainDump() {
    await this.page.getByTestId('brain-dump-trigger').click()
    await this.page.getByTestId('brain-dump-input').waitFor({ state: 'visible' })
  }

  /**
   * Adds a card through the brain dump flow.
   * Caller must mock POST /api/companion/generate-cards before calling this.
   * The mock should return: { cards: [{ title, description, priority, context: [] }] }
   */
  async addCardViaBrainDump(text: string) {
    await this.openBrainDump()
    await this.page.getByTestId('brain-dump-input').fill(text)
    await this.page.getByTestId('brain-dump-generate').click()
    await this.page.getByTestId('brain-dump-confirm').waitFor({ state: 'visible', timeout: 5000 })
    await this.page.getByTestId('brain-dump-confirm').click()
  }

  async dragCardToColumn(cardTitle: string, targetColumnId: 'idea' | 'specced' | 'in-agent' | 'done') {
    const card = this.cards().filter({ hasText: cardTitle }).first()
    const target = this.column(targetColumnId)
    await card.dragTo(target)
  }

  async clickSendToAgent(cardTitle: string) {
    const card = this.cards().filter({ hasText: cardTitle }).first()
    await card.getByTestId('kanban-send-to-agent').click()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/pages/KanbanPage.ts
git commit -m "test: add KanbanPage page object"
```

---

## Task 12: Create Page Objects — CompanionPage, TerminalPage, SparkCanvasPage

**Files:**
- Create: `e2e/pages/CompanionPage.ts`
- Create: `e2e/pages/TerminalPage.ts`
- Create: `e2e/pages/SparkCanvasPage.ts`

- [ ] **Step 1: Write CompanionPage.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class CompanionPage {
  readonly input: Locator
  readonly sendButton: Locator

  constructor(readonly page: Page) {
    this.input = page.getByTestId('companion-input')
    this.sendButton = page.getByTestId('companion-send')
  }

  messages(): Locator {
    return this.page.getByTestId('companion-message')
  }

  async sendMessage(text: string) {
    await this.input.fill(text)
    await this.sendButton.click()
  }

  async waitForResponse() {
    // Wait for at least one assistant message to appear after sending
    await this.page.waitForFunction(() => {
      const msgs = document.querySelectorAll('[data-testid="companion-message"]')
      return msgs.length > 0
    }, { timeout: 15000 })
  }
}
```

- [ ] **Step 2: Write TerminalPage.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class TerminalPage {
  readonly container: Locator

  constructor(readonly page: Page) {
    this.container = page.getByTestId('terminal-container')
  }

  async waitForReady() {
    await this.container.waitFor({ state: 'visible', timeout: 10000 })
    // xterm renders a canvas element once ready
    await this.page.waitForSelector('[data-testid="terminal-container"] canvas', { timeout: 10000 })
  }

  async sendViaQuickPrompt(text: string) {
    await this.page.keyboard.press('Meta+Enter')
    await this.page.getByTestId('quick-prompt-input').waitFor({ state: 'visible' })
    await this.page.getByTestId('quick-prompt-input').fill(text)
    await this.page.keyboard.press('Enter')
  }
}
```

- [ ] **Step 3: Write SparkCanvasPage.ts**

```ts
import { type Page, type Locator } from '@playwright/test'

export class SparkCanvasPage {
  readonly panel: Locator

  constructor(readonly page: Page) {
    this.panel = page.getByTestId('panel-spark')
  }

  async waitForReady() {
    await this.panel.waitFor({ state: 'visible', timeout: 8000 })
  }

  canvas(): Locator {
    return this.panel.locator('canvas')
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add e2e/pages/CompanionPage.ts e2e/pages/TerminalPage.ts e2e/pages/SparkCanvasPage.ts
git commit -m "test: add CompanionPage, TerminalPage, SparkCanvasPage page objects"
```

---

## Task 13: Write and run onboarding.spec.ts

**Files:**
- Create: `e2e/specs/onboarding.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test'
import { OnboardingPage } from '../pages/OnboardingPage'
import { AppShell } from '../pages/AppShell'

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding state to force the wizard
    await page.addInitScript(() => {
      localStorage.removeItem('mira-onboarding')
    })
    await page.goto('/')
  })

  test('shows the onboarding wizard on first visit', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.waitForVisible()
    await expect(onboarding.overlay).toBeVisible()
  })

  test('displays step content on each step', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.waitForVisible()
    await expect(onboarding.step).toBeVisible()
    await expect(onboarding.step.locator('h2')).toContainText('What are you building')
  })

  test('back button navigates to the previous step', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.waitForVisible()
    await onboarding.fillCurrentStep('A React app')
    await onboarding.clickNext()
    await expect(onboarding.backButton).toBeVisible()
    await onboarding.clickBack()
    await expect(onboarding.step.locator('h2')).toContainText('What are you building')
  })

  test('skip button dismisses wizard and shows app shell', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    await onboarding.waitForVisible()
    await onboarding.skip()
    await expect(onboarding.overlay).toBeHidden()
    await shell.waitForReady()
    await expect(shell.layoutEngine).toBeVisible()
  })

  test('completing all steps dismisses wizard and persists isComplete', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    await onboarding.waitForVisible()
    await onboarding.completeAllSteps()
    await expect(onboarding.overlay).toBeHidden()
    await shell.waitForReady()
    const stored = await page.evaluate(() => localStorage.getItem('mira-onboarding'))
    const state = JSON.parse(stored ?? '{}') as { state: { isComplete: boolean } }
    expect(state.state.isComplete).toBe(true)
  })

  test('re-visiting after completion skips wizard entirely', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    await shell.waitForReady()
    await expect(onboarding.overlay).toBeHidden()
  })
})
```

- [ ] **Step 2: Run just this spec (both servers must be running)**

```bash
npx playwright test e2e/specs/onboarding.spec.ts --reporter=line
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/onboarding.spec.ts
git commit -m "test: add onboarding.spec.ts (5 tests)"
```

---

## Task 14: Write and run shell.spec.ts

**Files:**
- Create: `e2e/specs/shell.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '../fixtures/index'
import { AppShell } from '../pages/AppShell'
import { CommandPalettePage } from '../pages/CommandPalette'

test.describe('App Shell', () => {
  test('top bar is visible with Mira Studio title', async ({ page, appPage }) => {
    void appPage
    const shell = new AppShell(page)
    await expect(shell.topbar).toBeVisible()
    await expect(shell.topbarTitle).toContainText('Mira Studio')
  })

  test('sidebar is visible by default', async ({ page, appPage }) => {
    void appPage
    const shell = new AppShell(page)
    await expect(shell.sidebar).toBeVisible()
    expect(await shell.isSidebarCollapsed()).toBe(false)
  })

  test('sidebar collapses and expands on toggle', async ({ page, appPage }) => {
    void appPage
    const shell = new AppShell(page)
    await shell.toggleSidebar()
    expect(await shell.isSidebarCollapsed()).toBe(true)
    await shell.toggleSidebar()
    expect(await shell.isSidebarCollapsed()).toBe(false)
  })

  test('status bar is visible with connection info', async ({ page, appPage }) => {
    void appPage
    const shell = new AppShell(page)
    await expect(shell.statusbar).toBeVisible()
    await expect(shell.statusbarConnection).toBeVisible()
  })

  test('command palette opens with Meta+K', async ({ page, appPage }) => {
    void appPage
    const palette = new CommandPalettePage(page)
    await palette.open()
    await expect(palette.palette).toBeVisible()
    await expect(palette.input).toBeFocused()
  })

  test('command palette filters results when typing', async ({ page, appPage }) => {
    void appPage
    const palette = new CommandPalettePage(page)
    await palette.open()
    await palette.search('kanban')
    const items = page.getByTestId('command-palette-item')
    await expect(items.first()).toContainText('Kanban')
  })

  test('command palette shows no results for gibberish', async ({ page, appPage }) => {
    void appPage
    const palette = new CommandPalettePage(page)
    await palette.open()
    await palette.search('xyzzy99999')
    await expect(page.getByText('No matching commands')).toBeVisible()
  })

  test('command palette closes with Escape', async ({ page, appPage }) => {
    void appPage
    const palette = new CommandPalettePage(page)
    await palette.open()
    await palette.close()
    await expect(palette.palette).toBeHidden()
  })

  test('command palette closes when clicking outside', async ({ page, appPage }) => {
    void appPage
    const palette = new CommandPalettePage(page)
    await palette.open()
    await page.mouse.click(10, 10)
    await expect(palette.palette).toBeHidden()
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/specs/shell.spec.ts --reporter=line
```

Expected: 9 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/shell.spec.ts
git commit -m "test: add shell.spec.ts (9 tests)"
```

---

## Task 15: Write and run panels.spec.ts

**Files:**
- Create: `e2e/specs/panels.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '../fixtures/index'
import { PanelManager } from '../pages/PanelManager'
import { AppShell } from '../pages/AppShell'

test.describe('Panel Lifecycle', () => {
  test('layout engine is visible after onboarding bypass', async ({ page, appPage }) => {
    void appPage
    const shell = new AppShell(page)
    await expect(shell.layoutEngine).toBeVisible()
  })

  test('can open a kanban panel via command palette', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open Kanban Board')
    await expect(panels.panelByType('kanban')).toBeVisible()
  })

  test('panel header is visible', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open Kanban Board')
    const kanban = panels.panelByType('kanban')
    await expect(kanban.getByTestId('panel-header')).toBeVisible()
  })

  test('panel can be closed via header close button', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open Kanban Board')
    await expect(panels.panelByType('kanban')).toBeVisible()
    await panels.closePanel('kanban')
    await expect(panels.panelByType('kanban')).toBeHidden()
  })

  test('can open multiple panels', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open Kanban Board')
    await panels.openPanelViaCommand('Open Build Journal')
    await expect(panels.panelByType('kanban')).toBeVisible()
    await expect(panels.panelByType('journal')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/specs/panels.spec.ts --reporter=line
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/panels.spec.ts
git commit -m "test: add panels.spec.ts (5 tests)"
```

---

## Task 16: Write and run kanban.spec.ts

**Files:**
- Create: `e2e/specs/kanban.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '../fixtures/index'
import { KanbanPage } from '../pages/KanbanPage'

test.describe('Kanban Board', () => {
  test('board renders all 4 columns', async ({ page, appWithPanels }) => {
    void appWithPanels
    const kanban = new KanbanPage(page)
    await expect(kanban.board).toBeVisible()
    await expect(kanban.column('idea')).toBeVisible()
    await expect(kanban.column('specced')).toBeVisible()
    await expect(kanban.column('in-agent')).toBeVisible()
    await expect(kanban.column('done')).toBeVisible()
  })

  test('brain dump button opens the brain dump modal', async ({ page, appWithPanels }) => {
    void appWithPanels
    const kanban = new KanbanPage(page)
    await kanban.openBrainDump()
    await expect(page.getByTestId('brain-dump-input')).toBeVisible()
  })

  test('brain dump creates a card when API returns a card (mocked)', async ({ page, appWithPanels }) => {
    void appWithPanels
    // Mock the generate-cards endpoint — brain dump hits this relative URL
    await page.route('**/api/companion/generate-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cards: [
            {
              title: 'Test Card From Brain Dump',
              description: 'Auto-generated in test',
              priority: 'medium',
              context: [],
            },
          ],
        }),
      })
    })

    const kanban = new KanbanPage(page)
    await kanban.addCardViaBrainDump('Some ideas to plan')

    // The confirmed card should appear in the Idea column
    await expect(kanban.cardsInColumn('idea').filter({ hasText: 'Test Card From Brain Dump' })).toBeVisible()
  })

  test('card can be dragged to a different column', async ({ page, appWithPanels }) => {
    void appWithPanels
    // Seed a card first via mocked brain dump
    await page.route('**/api/companion/generate-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cards: [{ title: 'Drag Me', description: '', priority: 'low', context: [] }],
        }),
      })
    })
    const kanban = new KanbanPage(page)
    await kanban.addCardViaBrainDump('drag test')
    await kanban.dragCardToColumn('Drag Me', 'specced')
    await expect(kanban.cardsInColumn('specced').filter({ hasText: 'Drag Me' })).toBeVisible()
  })

  test('send to agent button is visible on each card', async ({ page, appWithPanels }) => {
    void appWithPanels
    await page.route('**/api/companion/generate-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cards: [{ title: 'Agent Card', description: '', priority: 'high', context: [] }],
        }),
      })
    })
    const kanban = new KanbanPage(page)
    await kanban.addCardViaBrainDump('agent test')
    const card = kanban.cards().filter({ hasText: 'Agent Card' }).first()
    await expect(card.getByTestId('kanban-send-to-agent')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/specs/kanban.spec.ts --reporter=line
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/kanban.spec.ts
git commit -m "test: add kanban.spec.ts (5 tests, mocked brain dump API)"
```

---

## Task 17: Write and run companion.spec.ts

**Files:**
- Create: `e2e/specs/companion.spec.ts`

- [ ] **Step 1: Write the spec**

The companion chat endpoint (`POST /api/companion/chat`) streams SSE. Mock it to return a simple text response.

```ts
import { test, expect } from '../fixtures/index'
import { PanelManager } from '../pages/PanelManager'
import { CompanionPage } from '../pages/CompanionPage'

test.describe('Companion Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the companion chat SSE endpoint
    await page.route('**/api/companion/chat', async (route) => {
      const body = [
        'data: {"type":"token","content":"Hello"}\n\n',
        'data: {"type":"token","content":" from"}\n\n',
        'data: {"type":"token","content":" Mira!"}\n\n',
        'data: {"type":"done"}\n\n',
      ].join('')
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body,
      })
    })
  })

  test('companion panel shows input and send button', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Toggle Companion')
    const companion = new CompanionPage(page)
    await expect(companion.input).toBeVisible()
    await expect(companion.sendButton).toBeVisible()
  })

  test('sending a message adds it to the thread', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Toggle Companion')
    const companion = new CompanionPage(page)
    await companion.sendMessage('Hello Mira')
    await expect(companion.messages().filter({ hasText: 'Hello Mira' })).toBeVisible()
  })

  test('response appears after sending a message', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Toggle Companion')
    const companion = new CompanionPage(page)
    await companion.sendMessage('Hi')
    await companion.waitForResponse()
    // The mocked response contains "Hello from Mira!"
    await expect(companion.messages().filter({ hasText: 'Hello from Mira!' })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/specs/companion.spec.ts --reporter=line
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/companion.spec.ts
git commit -m "test: add companion.spec.ts (3 tests, mocked SSE)"
```

---

## Task 18: Write terminal.spec.ts (tagged @pty — local only)

**Files:**
- Create: `e2e/specs/terminal.spec.ts`

These tests require a real PTY (node-pty). They are tagged `@pty` and excluded from CI via `grepInvert` in `playwright.config.ts`. Run locally only.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '../fixtures/index'
import { PanelManager } from '../pages/PanelManager'
import { TerminalPage } from '../pages/TerminalPage'

// All tests in this file are @pty — excluded from CI
test.describe('@pty Terminal Panel', () => {
  test('terminal panel renders xterm canvas', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open New Terminal')
    const terminal = new TerminalPage(page)
    await terminal.waitForReady()
    await expect(terminal.container).toBeVisible()
    // xterm.js renders a <canvas> element once initialised
    await expect(terminal.container.locator('canvas')).toBeVisible()
  })

  test('quick prompt bar injects text into active session', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open New Terminal')
    const terminal = new TerminalPage(page)
    await terminal.waitForReady()
    await terminal.sendViaQuickPrompt('echo hello')
    // Quick prompt bar should close after send
    await expect(page.getByTestId('quick-prompt-input')).toBeHidden()
  })

  test('new terminal session can be spawned via command', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open New Terminal')
    await panels.openPanelViaCommand('Open New Terminal')
    // Both terminal panels should be present
    const terminalPanels = page.locator('[data-testid="panel-terminal"]')
    await expect(terminalPanels).toHaveCount(2)
  })
})
```

- [ ] **Step 2: Run the spec locally (servers must be running with node-pty working)**

```bash
npx playwright test e2e/specs/terminal.spec.ts --reporter=line
```

Expected: 3 tests pass (or are skipped in CI).

- [ ] **Step 3: Verify CI excludes these tests**

```bash
CI=true npx playwright test --list 2>&1 | grep terminal
```

Expected: no terminal spec tests listed.

- [ ] **Step 4: Commit**

```bash
git add e2e/specs/terminal.spec.ts
git commit -m "test: add terminal.spec.ts (@pty, 3 tests, excluded from CI)"
```

---

## Task 19: Write regression.spec.ts

**Files:**
- Create: `e2e/specs/regression.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '../fixtures/index'
import { OnboardingPage } from '../pages/OnboardingPage'
import { AppShell } from '../pages/AppShell'
import { PanelManager } from '../pages/PanelManager'
import { KanbanPage } from '../pages/KanbanPage'
import { CompanionPage } from '../pages/CompanionPage'

test.describe('Regression — Cross-Feature Flows', () => {
  test('full onboarding → shell → kanban flow', async ({ page }) => {
    // Start fresh — no onboarding bypass
    await page.addInitScript(() => {
      localStorage.removeItem('mira-onboarding')
    })
    await page.goto('/')

    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    const panels = new PanelManager(page)

    // 1. Wizard appears
    await onboarding.waitForVisible()
    await expect(onboarding.overlay).toBeVisible()

    // 2. Skip wizard
    await onboarding.skip()
    await shell.waitForReady()

    // 3. Open kanban
    await panels.openPanelViaCommand('Open Kanban Board')
    const kanban = new KanbanPage(page)
    await expect(kanban.board).toBeVisible()
    await expect(kanban.column('idea')).toBeVisible()
  })

  test('companion chat → config change action reflected in UI', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)

    // Mock companion to return a profile switch action
    await page.route('**/api/companion/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"type":"token","content":"Switching to Minimal profile."}\n\ndata: {"type":"done"}\n\n',
      })
    })

    await panels.openPanelViaCommand('Toggle Companion')
    const companion = new CompanionPage(page)
    await companion.sendMessage('Switch to minimal mode')
    await companion.waitForResponse()
    // Response is visible in thread
    await expect(companion.messages().filter({ hasText: 'Switching to Minimal profile.' })).toBeVisible()
  })

  test('command palette can open and close multiple panels in sequence', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Open Kanban Board')
    await panels.openPanelViaCommand('Open Build Journal')
    await expect(panels.panelByType('kanban')).toBeVisible()
    await expect(panels.panelByType('journal')).toBeVisible()
    await panels.closePanel('kanban')
    await expect(panels.panelByType('kanban')).toBeHidden()
    await expect(panels.panelByType('journal')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/specs/regression.spec.ts --reporter=line
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/regression.spec.ts
git commit -m "test: add regression.spec.ts (3 cross-feature flow tests)"
```

---

## Task 20: Delete old spec files and run the full suite

**Files:**
- Delete: `e2e/smoke.spec.ts`
- Delete: `e2e/features.spec.ts`
- Delete: `e2e/full-suite.spec.ts`

- [ ] **Step 1: Delete the old spec files**

```bash
rm e2e/smoke.spec.ts e2e/features.spec.ts e2e/full-suite.spec.ts
```

- [ ] **Step 2: Verify the new suite lists correctly**

```bash
npx playwright test --list
```

Expected: ~33 tests listed across `e2e/specs/*.spec.ts` (excludes @pty tests since CI grepInvert is not set locally).

- [ ] **Step 3: Run the full non-pty suite (both servers must be running)**

```bash
npx playwright test --grep-invert "@pty" --reporter=line
```

Expected: all non-pty tests pass (~30 tests). Fix any failures before proceeding.

- [ ] **Step 4: Open Playwright UI and verify tests are visible**

```bash
npx playwright test --ui
```

Expected: All spec files appear in the sidebar, tests are listed and runnable.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: replace failing suite with POM-based E2E tests (30 tests, @pty excluded in CI)"
```

---

## Self-Check: Spec Coverage vs Design

| Design requirement | Task |
|---|---|
| Onboarding: first visit shows wizard | Task 13 |
| Onboarding: step through with Next/Back | Task 13 |
| Onboarding: skip | Task 13 |
| Onboarding: persists isComplete | Task 13 |
| Onboarding: re-visit bypasses wizard | Task 13 |
| Shell: TopBar title | Task 14 |
| Shell: Sidebar collapse/expand | Task 14 |
| Shell: StatusBar connection | Task 14 |
| Shell: Command palette open/filter/execute/close | Task 14 |
| Panels: layout engine renders | Task 15 |
| Panels: close via header button | Task 15 |
| Panels: add via command palette | Task 15 |
| Kanban: 4 columns render | Task 16 |
| Kanban: brain dump creates card | Task 16 |
| Kanban: drag card between columns | Task 16 |
| Kanban: send-to-agent button visible | Task 16 |
| Companion: input and send visible | Task 17 |
| Companion: message appears in thread | Task 17 |
| Companion: response streams in | Task 17 |
| Terminal: renders xterm canvas | Task 18 (@pty) |
| Terminal: quick prompt injects text | Task 18 (@pty) |
| Terminal: new session spawned | Task 18 (@pty) |
| Regression: onboarding → shell → kanban | Task 19 |
| Regression: companion → response visible | Task 19 |
| UI mode shows tests | Task 1 (reuseExistingServer fix) + Task 20 |
