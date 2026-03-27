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
