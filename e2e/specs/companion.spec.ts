import { test, expect } from '../fixtures/index'
import { PanelManager } from '../pages/PanelManager'
import { CompanionPage } from '../pages/CompanionPage'

test.describe('Companion Chat', () => {
  test.beforeEach(async ({ page }) => {
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
    await panels.openPanelViaCommand('Companion')
    const companion = new CompanionPage(page)
    await expect(companion.input).toBeVisible()
    await expect(companion.sendButton).toBeVisible()
  })

  test('sending a message adds it to the thread', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Companion')
    const companion = new CompanionPage(page)
    await companion.sendMessage('Hello Mira')
    await expect(companion.messages().filter({ hasText: 'Hello Mira' })).toBeVisible()
  })

  test('response appears after sending a message', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Companion')
    const companion = new CompanionPage(page)
    await companion.sendMessage('Hi')
    await companion.waitForResponse()
    await expect(companion.messages().last()).toBeVisible()
  })
})
