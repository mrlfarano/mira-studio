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
        JSON.stringify({ completed: true, updatedAt: Date.now() })
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
        JSON.stringify({ completed: true, updatedAt: Date.now() })
      )
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="layout-engine"]', { timeout: 10000 })
    // Open kanban via command palette
    await page.keyboard.press('ControlOrMeta+k')
    await page.waitForSelector('[data-testid="command-palette"]', { timeout: 5000 })
    await page.fill('[data-testid="command-palette-input"]', 'kanban')
    await page.keyboard.press('Enter')
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 8000 })
    await use()
  },
})

export { expect }
