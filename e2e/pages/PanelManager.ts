import { type Page, type Locator } from '@playwright/test'
import { CommandPalettePage } from './CommandPalette'

export class PanelManager {
  private readonly commandPalette: CommandPalettePage

  constructor(readonly page: Page) {
    this.commandPalette = new CommandPalettePage(page)
  }

  allPanels(): Locator {
    return this.page.locator('[data-testid^="panel-"]')
  }

  panelByType(type: string): Locator {
    return this.page.getByTestId(`panel-${type}`)
  }

  async closePanel(type: string) {
    const panel = this.panelByType(type)
    await panel.getByTestId('panel-close').click()
  }

  async openPanelViaCommand(commandLabel: string) {
    await this.commandPalette.open()
    await this.commandPalette.execute(commandLabel)
  }
}
