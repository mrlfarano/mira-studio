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
    // Use JS drag event simulation so dataTransfer.setData/getData round-trip works reliably
    await this.page.evaluate(
      ({ title, colId }) => {
        const card = Array.from(document.querySelectorAll('[data-testid="kanban-card"]')).find(
          (el) => el.textContent?.includes(title)
        ) as HTMLElement | undefined
        const col = document.querySelector(`[data-testid="kanban-column-${colId}"]`) as HTMLElement | undefined
        if (!card || !col) throw new Error(`drag target not found: card="${title}" col="${colId}"`)
        const cardId = card.getAttribute('data-card-id') ?? ''
        const dt = new DataTransfer()
        dt.setData('text/plain', cardId)
        card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
        col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
        col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
        card.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }))
      },
      { title: cardTitle, colId: targetColumnId }
    )
  }

  async clickSendToAgent(cardTitle: string) {
    const card = this.cards().filter({ hasText: cardTitle }).first()
    await card.getByTestId('kanban-send-to-agent').click()
  }
}
