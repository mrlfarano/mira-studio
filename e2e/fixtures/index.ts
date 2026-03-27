import { test as base, expect } from '@playwright/test'

const EMPTY_WORKSPACE = {
  name: 'default',
  profile: 'Balanced',
  layout: [],
  toggles: {},
  keybindings: {},
}

type MiraFixtures = {
  appPage: void
  appWithPanels: void
}

export const test = base.extend<MiraFixtures>({
  appPage: async ({ page }, use) => {
    // Return empty workspace layout so pre-existing .mira/ panels don't bleed into tests
    await page.route('**/api/config/workspaces/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_WORKSPACE) })
      } else {
        await route.continue()
      }
    })
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ completed: true, updatedAt: Date.now() })
      )
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="layout-engine"]', { timeout: 10000 })
    await use()
  },

  appWithPanels: async ({ page }, use) => {
    // Return empty workspace layout so pre-existing .mira/ panels don't bleed into tests
    await page.route('**/api/config/workspaces/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_WORKSPACE) })
      } else {
        await route.continue()
      }
    })
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ completed: true, updatedAt: Date.now() })
      )
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="layout-engine"]', { timeout: 10000 })
    // Open kanban via command palette (click hidden trigger button — avoids keyboard sim issues)
    await page.click('[data-testid="command-palette-trigger"]', { force: true })
    await page.waitForSelector('[data-testid="command-palette"]', { timeout: 5000 })
    await page.fill('[data-testid="command-palette-input"]', 'kanban')
    await page.keyboard.press('Enter')
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 8000 })
    await use()
  },
})

export { expect }
