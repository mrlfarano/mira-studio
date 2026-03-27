import { type Page, type Locator } from '@playwright/test'

export class CommandPalettePage {
  readonly palette: Locator
  readonly input: Locator

  constructor(readonly page: Page) {
    this.palette = page.getByTestId('command-palette')
    this.input = page.getByTestId('command-palette-input')
  }

  async open() {
    await this.page.keyboard.press('Meta+k')
    await this.palette.waitFor({ state: 'visible', timeout: 3000 })
  }

  async close() {
    await this.page.keyboard.press('Escape')
    await this.palette.waitFor({ state: 'hidden', timeout: 3000 })
  }

  async search(query: string) {
    await this.input.fill(query)
  }

  async execute(label: string) {
    await this.search(label)
    await this.page
      .getByTestId('command-palette-item')
      .filter({ hasText: label })
      .first()
      .click()
  }

  async isOpen(): Promise<boolean> {
    return this.palette.isVisible()
  }
}
