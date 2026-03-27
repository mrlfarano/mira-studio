import { type Page, type Locator } from '@playwright/test'

export class CompanionPage {
  readonly input: Locator
  readonly sendButton: Locator

  constructor(readonly page: Page) {
    this.input = page.getByTestId('companion-input')
    this.sendButton = page.getByTestId('companion-send')
  }

  messages(): Locator {
    return this.page.getByTestId('companion-message')
  }

  async sendMessage(text: string) {
    await this.input.fill(text)
    await this.sendButton.click()
  }

  async waitForResponse() {
    await this.page.waitForFunction(() => {
      const msgs = document.querySelectorAll('[data-testid="companion-message"]')
      return msgs.length > 0
    }, { timeout: 15000 })
  }
}
