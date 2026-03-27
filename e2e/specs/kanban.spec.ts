import { test, expect } from '../fixtures/index'
import { KanbanPage } from '../pages/KanbanPage'

test.describe('Kanban Board', () => {
  test('board renders all 4 columns', async ({ page, appWithPanels }) => {
    void appWithPanels
    const kanban = new KanbanPage(page)
    await expect(kanban.board).toBeVisible()
    await expect(kanban.column('idea')).toBeVisible()
    await expect(kanban.column('specced')).toBeVisible()
    await expect(kanban.column('in-agent')).toBeVisible()
    await expect(kanban.column('done')).toBeVisible()
  })

  test('brain dump button opens the brain dump modal', async ({ page, appWithPanels }) => {
    void appWithPanels
    const kanban = new KanbanPage(page)
    await kanban.openBrainDump()
    await expect(page.getByTestId('brain-dump-input')).toBeVisible()
  })

  test('brain dump creates a card when API returns a card (mocked)', async ({ page, appWithPanels }) => {
    void appWithPanels
    await page.route('**/api/companion/generate-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cards: [
            {
              title: 'Test Card From Brain Dump',
              description: 'Auto-generated in test',
              priority: 'medium',
              context: [],
            },
          ],
        }),
      })
    })

    const kanban = new KanbanPage(page)
    await kanban.addCardViaBrainDump('Some ideas to plan')
    await expect(kanban.cardsInColumn('idea').filter({ hasText: 'Test Card From Brain Dump' })).toBeVisible()
  })

  test('card can be dragged to a different column', async ({ page, appWithPanels }) => {
    void appWithPanels
    await page.route('**/api/companion/generate-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cards: [{ title: 'Drag Me', description: '', priority: 'low', context: [] }],
        }),
      })
    })
    const kanban = new KanbanPage(page)
    await kanban.addCardViaBrainDump('drag test')
    await kanban.dragCardToColumn('Drag Me', 'specced')
    await expect(kanban.cardsInColumn('specced').filter({ hasText: 'Drag Me' })).toBeVisible()
  })

  test('send to agent button is visible on each card', async ({ page, appWithPanels }) => {
    void appWithPanels
    await page.route('**/api/companion/generate-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cards: [{ title: 'Agent Card', description: '', priority: 'high', context: [] }],
        }),
      })
    })
    const kanban = new KanbanPage(page)
    await kanban.addCardViaBrainDump('agent test')
    const card = kanban.cards().filter({ hasText: 'Agent Card' }).first()
    await expect(card.getByTestId('kanban-send-to-agent')).toBeVisible()
  })
})
