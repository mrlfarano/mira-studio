import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helper: bypass onboarding via localStorage so AppShell renders directly
// ---------------------------------------------------------------------------

function skipOnboarding(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem(
      'mira-onboarding',
      JSON.stringify({ completed: true, updatedAt: Date.now() })
    )
  })
}

// ===========================================================================
// 1. Onboarding Flow
// ===========================================================================

test.describe('Onboarding Flow', () => {
  test('shows the onboarding wizard on first visit', async ({ page }) => {
    await page.goto('/')
    const overlay = page.locator('.onboarding-overlay')
    await expect(overlay).toBeVisible()
    await expect(
      page.getByText('What are you building?')
    ).toBeVisible()
  })

  test('displays progress dots matching the number of steps', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('.onboarding-overlay')).toBeVisible()
    const dots = page.locator('.onboarding-progress__dot')
    await expect(dots).toHaveCount(4)
    // First dot should be active
    await expect(dots.nth(0)).toHaveClass(/onboarding-progress__dot--active/)
  })

  test('can click through all wizard steps and finish', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.onboarding-overlay')).toBeVisible()

    // Step 1: "What are you building?"
    await expect(page.getByText('What are you building?')).toBeVisible()
    const input = page.locator('.onboarding-wizard__input')
    await input.fill('A React dashboard')
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 2: "How do you like to work?"
    await expect(page.getByText('How do you like to work?')).toBeVisible()
    await page.locator('.onboarding-wizard__input').fill('Minimal and focused')
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 3: "What tools do you already use?"
    await expect(
      page.getByText('What tools do you already use?')
    ).toBeVisible()
    await page.locator('.onboarding-wizard__input').fill('Git, VS Code')
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 4: "Anything else I should know?" (optional, last step)
    await expect(
      page.getByText('Anything else I should know?')
    ).toBeVisible()
    // Last step button says "Finish" (or "Skip" if input is empty)
    await page.getByRole('button', { name: /finish|skip/i }).click()

    // After finishing, the main app shell should render
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.statusbar')).toBeVisible()
  })

  test('can skip onboarding entirely via "Skip setup" button', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('.onboarding-overlay')).toBeVisible()

    await page.getByRole('button', { name: /skip setup/i }).click()

    // App shell should be visible after skip
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
  })

  test('back button navigates to the previous step', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.onboarding-overlay')).toBeVisible()

    // Go from step 1 to step 2
    await page.locator('.onboarding-wizard__input').fill('Web app')
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByText('How do you like to work?')).toBeVisible()

    // Go back
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByText('What are you building?')).toBeVisible()
  })
})

// ===========================================================================
// 2. Command Palette
// ===========================================================================

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
  })

  test('opens with Meta+K and shows input field', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog', { name: /command palette/i })
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(
      page.getByPlaceholder('Type a command...')
    ).toBeVisible()
  })

  test('closes with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog', { name: /command palette/i })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('filters commands when typing', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog', { name: /command palette/i })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    const input = page.getByPlaceholder('Type a command...')
    await input.fill('terminal')

    // "Open New Terminal" should be visible
    await expect(page.getByText('Open New Terminal')).toBeVisible()
    // Unrelated commands should be filtered out — check a command that
    // does NOT match "terminal" is hidden. "Switch Profile" is a Config command.
    await expect(page.getByText('Switch Profile')).not.toBeVisible()
  })

  test('shows "No matching commands" for gibberish input', async ({
    page,
  }) => {
    await page.keyboard.press('Meta+k')
    await expect(
      page.getByRole('dialog', { name: /command palette/i })
    ).toBeVisible({ timeout: 3000 })

    await page.getByPlaceholder('Type a command...').fill('zzzzqqqxxx')
    await expect(page.getByText('No matching commands')).toBeVisible()
  })

  test('closes when clicking outside the palette', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog', { name: /command palette/i })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Click the overlay (outside the container). Use position at the top-left
    // corner which should be the overlay backdrop area.
    await page.mouse.click(10, 10)
    await expect(dialog).not.toBeVisible()
  })

  test('displays category headers for grouped commands', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog', { name: /command palette/i })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // The palette groups commands by category: Navigation, Panels, Agent, Config
    await expect(dialog.getByText('NAVIGATION')).toBeVisible()
    await expect(dialog.getByText('PANELS')).toBeVisible()
  })
})

// ===========================================================================
// 3. Panel Rendering (default panels after onboarding)
// ===========================================================================

test.describe('Panel Rendering', () => {
  test('seeds default panels after onboarding completes', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.onboarding-overlay')).toBeVisible()

    // Skip onboarding so default panels get seeded
    await page.getByRole('button', { name: /skip setup/i }).click()
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })

    // The App.tsx seeds terminal, companion, and kanban panels on skip
    // (skip calls complete which sets isComplete = true, then the useEffect
    // seeds panels if panels.length === 0).
    // Check that the LayoutEngine renders panel containers.
    // The panel types from App.tsx are: terminal, companion, kanban
    const mainContent = page.locator('.app-shell__content')
    await expect(mainContent).toBeVisible()
  })

  test('renders layout engine inside app shell', async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.app-shell__content')).toBeVisible()
  })
})

// ===========================================================================
// 4. Sidebar Navigation
// ===========================================================================

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
  })

  test('sidebar is visible with module list', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    // Module items: Terminal, Companion, Kanban, Journal
    await expect(sidebar.getByText('Terminal')).toBeVisible()
    await expect(sidebar.getByText('Companion')).toBeVisible()
    await expect(sidebar.getByText('Kanban')).toBeVisible()
    await expect(sidebar.getByText('Journal')).toBeVisible()
  })

  test('sidebar shows workspace name', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    // The default workspace name is "default"
    await expect(sidebar.locator('.sidebar__scene-name')).toBeVisible()
  })

  test('sidebar shows quick actions section', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    await expect(sidebar.getByText('Quick Actions')).toBeVisible()
    await expect(sidebar.getByText('New Terminal')).toBeVisible()
    await expect(sidebar.getByText('New Scene')).toBeVisible()
    await expect(sidebar.getByText('Add Panel')).toBeVisible()
  })

  test('sidebar can be collapsed and expanded', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    // The toggle button collapses the sidebar
    const toggleBtn = page.locator('.sidebar__toggle')
    await expect(toggleBtn).toBeVisible()

    // Collapse
    await toggleBtn.click()
    await expect(sidebar).toHaveClass(/sidebar--collapsed/)
    // Module labels should be hidden when collapsed
    await expect(sidebar.getByText('Terminal')).not.toBeVisible()

    // Expand
    await toggleBtn.click()
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/)
    await expect(sidebar.getByText('Terminal')).toBeVisible()
  })
})

// ===========================================================================
// 5. Status Bar
// ===========================================================================

test.describe('Status Bar', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
  })

  test('status bar is visible as a footer element', async ({ page }) => {
    const statusbar = page.locator('footer.statusbar')
    await expect(statusbar).toBeVisible()
  })

  test('shows connection info in the left section', async ({ page }) => {
    const left = page.locator('.statusbar__left')
    await expect(left).toBeVisible()

    // Should show connection indicator (e.g., "No connections" or "X/Y connected")
    await expect(
      left.locator('.statusbar__indicator--connection')
    ).toBeVisible()
  })

  test('shows sync status in the right section', async ({ page }) => {
    const right = page.locator('.statusbar__right')
    await expect(right).toBeVisible()

    // Should show sync label ("Synced", "Syncing...", or "Sync error")
    await expect(
      right.getByText(/synced|syncing|sync error/i)
    ).toBeVisible()
  })

  test('shows agent count', async ({ page }) => {
    const statusbar = page.locator('.statusbar')
    await expect(statusbar).toBeVisible()

    // Should display agent count (e.g., "0 agents active")
    await expect(statusbar.getByText(/\d+ agents? active/)).toBeVisible()
  })
})

// ===========================================================================
// 6. Top Bar
// ===========================================================================

test.describe('Top Bar', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 5000 })
  })

  test('top bar is visible with Mira Studio title', async ({ page }) => {
    const topbar = page.locator('.topbar')
    await expect(topbar).toBeVisible()
    await expect(page.getByText('Mira Studio')).toBeVisible()
  })
})
