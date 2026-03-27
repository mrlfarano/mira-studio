import { type Page, type Locator } from '@playwright/test'

export class SparkCanvasPage {
  readonly panel: Locator

  constructor(readonly page: Page) {
    this.panel = page.getByTestId('panel-spark')
  }

  async waitForReady() {
    await this.panel.waitFor({ state: 'visible', timeout: 8000 })
  }

  canvas(): Locator {
    return this.panel.locator('canvas')
  }
}
