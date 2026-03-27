import { test, expect } from '../fixtures/index'
import { PanelManager } from '../pages/PanelManager'
import { TerminalPage } from '../pages/TerminalPage'

// All tests tagged @pty — excluded from CI via grepInvert in playwright.config.ts
test.describe('@pty Terminal Panel', () => {
  test('terminal panel renders xterm canvas', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Terminal')
    const terminal = new TerminalPage(page)
    await terminal.waitForReady()
    await expect(terminal.container).toBeVisible()
    await expect(terminal.container.locator('canvas')).toBeVisible()
  })

  test('quick prompt bar injects text into active session', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Terminal')
    const terminal = new TerminalPage(page)
    await terminal.waitForReady()
    await terminal.sendViaQuickPrompt('echo hello')
    await expect(page.getByTestId('quick-prompt-input')).toBeHidden()
  })

  test('new terminal session can be spawned via command', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Terminal')
    await panels.openPanelViaCommand('Terminal')
    const terminalPanels = page.locator('[data-testid="panel-terminal"]')
    await expect(terminalPanels).toHaveCount(2)
  })
})
