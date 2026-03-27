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
    await expect(items.first()).toBeVisible()
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
