import { type Page, type Locator } from '@playwright/test'

export class TerminalPage {
  readonly container: Locator

  constructor(readonly page: Page) {
    this.container = page.getByTestId('terminal-container')
  }

  async waitForReady() {
    await this.container.waitFor({ state: 'visible', timeout: 10000 })
    await this.page.waitForSelector('[data-testid="terminal-container"] canvas', { timeout: 10000 })
  }

  async sendViaQuickPrompt(text: string) {
    await this.page.keyboard.press('Meta+Enter')
    await this.page.getByTestId('quick-prompt-input').waitFor({ state: 'visible' })
    await this.page.getByTestId('quick-prompt-input').fill(text)
    await this.page.keyboard.press('Enter')
  }
}
