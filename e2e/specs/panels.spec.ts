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
    await panels.openPanelViaCommand('Kanban')
    await expect(panels.panelByType('kanban')).toBeVisible()
  })

  test('panel header is visible', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Kanban')
    const kanban = panels.panelByType('kanban')
    await expect(kanban.getByTestId('panel-header')).toBeVisible()
  })

  test('panel can be closed via header close button', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Kanban')
    await expect(panels.panelByType('kanban')).toBeVisible()
    await panels.closePanel('kanban')
    await expect(panels.panelByType('kanban')).toBeHidden()
  })

  test('can open multiple panels', async ({ page, appPage }) => {
    void appPage
    const panels = new PanelManager(page)
    await panels.openPanelViaCommand('Kanban')
    await panels.openPanelViaCommand('Journal')
    await expect(panels.panelByType('kanban')).toBeVisible()
    await expect(panels.panelByType('journal')).toBeVisible()
  })
})
