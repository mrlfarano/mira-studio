import { test, expect } from '../fixtures/index'
import { OnboardingPage } from '../pages/OnboardingPage'
import { AppShell } from '../pages/AppShell'
import { PanelManager } from '../pages/PanelManager'
import { KanbanPage } from '../pages/KanbanPage'
import { CompanionPage } from '../pages/CompanionPage'

test.describe('Regression — Cross-Feature Flows', () => {
  test('full onboarding → shell → kanban flow', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('mira-onboarding')
    })
    await page.goto('/')

    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    const panels = new PanelManager(page)

    await onboarding.waitForVisible()
    await expect(onboarding.overlay).toBeVisible()

    await onboarding.skip()
    await shell.waitForReady()

    await panels.openPanelViaCommand('Kanban')
    const kanban = new KanbanPage(page)
    await expect(kanban.board).toBeVisible()
    await expect(kanban.column('idea')).toBeVisible()
  })

  test('companion chat → response visible in thread', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)

    await page.route('**/api/companion/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"type":"token","content":"Switching to Minimal profile."}\n\ndata: {"type":"done"}\n\n',
      })
    })

    await panels.openPanelViaCommand('Companion')
    const companion = new CompanionPage(page)
    await companion.sendMessage('Switch to minimal mode')
    await companion.waitForResponse()
    await expect(companion.messages().last()).toBeVisible()
  })

  test('command palette can open and close multiple panels in sequence', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Kanban')
    await panels.openPanelViaCommand('Journal')
    await expect(panels.panelByType('kanban')).toBeVisible()
    await expect(panels.panelByType('journal')).toBeVisible()
    await panels.closePanel('kanban')
    await expect(panels.panelByType('kanban')).toBeHidden()
    await expect(panels.panelByType('journal')).toBeVisible()
  })
})
