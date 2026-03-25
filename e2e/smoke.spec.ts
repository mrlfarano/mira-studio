import { test, expect } from '@playwright/test'

test('loads the page and displays the title', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Mira Studio')
})
