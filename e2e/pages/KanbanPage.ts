import { type Page, type Locator } from '@playwright/test'

export class KanbanPage {
  readonly board: Locator

  constructor(readonly page: Page) {
    this.board = page.getByTestId('kanban-board')
  }

  column(id: 'idea' | 'specced' | 'in-agent' | 'done'): Locator {
    return this.page.getByTestId(`kanban-column-${id}`)
  }

  cards(): Locator {
    return this.page.getByTestId('kanban-card')
  }

  cardsInColumn(id: 'idea' | 'specced' | 'in-agent' | 'done'): Locator {
    return this.column(id).getByTestId('kanban-card')
  }

  async openBrainDump() {
    await this.page.getByTestId('brain-dump-trigger').click()
    await this.page.getByTestId('brain-dump-input').waitFor({ state: 'visible' })
  }

  async addCardViaBrainDump(text: string) {
    await this.openBrainDump()
    await this.page.getByTestId('brain-dump-input').fill(text)
    await this.page.getByTestId('brain-dump-generate').click()
    await this.page.getByTestId('brain-dump-confirm').waitFor({ state: 'visible', timeout: 5000 })
    await this.page.getByTestId('brain-dump-confirm').click()
  }

  async dragCardToColumn(cardTitle: string, targetColumnId: 'idea' | 'specced' | 'in-agent' | 'done') {
    const card = this.cards().filter({ hasText: cardTitle }).first()
    const target = this.column(targetColumnId)
    await card.dragTo(target)
  }

  async clickSendToAgent(cardTitle: string) {
    const card = this.cards().filter({ hasText: cardTitle }).first()
    await card.getByTestId('kanban-send-to-agent').click()
  }
}
