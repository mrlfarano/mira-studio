import { describe, it, expect, beforeEach } from 'vitest'
import { useToggleStore } from '../store/toggle-store'
import { useKanbanStore } from '../store/kanban-store'
import { useNotificationStore } from '../store/notification-store'
import { useCommandStore } from '../store/command-store'
import { useSceneStore } from '../store/scene-store'
import { useThemeStore } from '../store/theme-store'
import { useOnboardingStore } from '../store/onboarding-store'

describe('Toggle Store', () => {
  beforeEach(() => useToggleStore.setState(useToggleStore.getInitialState()))

  it('has default active profile', () => {
    const state = useToggleStore.getState()
    expect(state.activeProfile).toBeDefined()
  })

  it('sets active profile', () => {
    useToggleStore.getState().setActiveProfile('Minimal')
    expect(useToggleStore.getState().activeProfile).toBe('Minimal')
  })
})

describe('Kanban Store', () => {
  beforeEach(() => useKanbanStore.setState(useKanbanStore.getInitialState()))

  it('starts with 4 columns', () => {
    expect(useKanbanStore.getState().columns).toHaveLength(4)
  })

  it('adds a card', () => {
    useKanbanStore.getState().addCard({
      title: 'Test Card',
      description: 'Test description',
      status: 'idea',
      priority: 'medium',
      context: [],
    })
    expect(useKanbanStore.getState().cards).toHaveLength(1)
    expect(useKanbanStore.getState().cards[0].title).toBe('Test Card')
  })

  it('moves a card between columns', () => {
    useKanbanStore.getState().addCard({
      title: 'Move Me',
      description: '',
      status: 'idea',
      priority: 'low',
      context: [],
    })
    const card = useKanbanStore.getState().cards[0]
    useKanbanStore.getState().moveCard(card.id, 'specced')
    expect(useKanbanStore.getState().cards[0].status).toBe('specced')
  })

  it('deletes a card', () => {
    useKanbanStore.getState().addCard({
      title: 'Delete Me',
      description: '',
      status: 'idea',
      priority: 'low',
      context: [],
    })
    const card = useKanbanStore.getState().cards[0]
    useKanbanStore.getState().deleteCard(card.id)
    expect(useKanbanStore.getState().cards).toHaveLength(0)
  })
})

describe('Notification Store', () => {
  beforeEach(() =>
    useNotificationStore.setState(useNotificationStore.getInitialState())
  )

  it('starts empty', () => {
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('adds a notification', () => {
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: 'Test',
      message: 'Hello',
      source: 'test',
    })
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('marks notification as read', () => {
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: 'Test',
      message: 'Hello',
      source: 'test',
    })
    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().markRead(id)
    expect(useNotificationStore.getState().notifications[0].read).toBe(true)
  })

  it('clears all notifications', () => {
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: '1',
      message: '',
      source: 'test',
    })
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: '2',
      message: '',
      source: 'test',
    })
    useNotificationStore.getState().clearAll()
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })
})

describe('Command Store', () => {
  beforeEach(() => useCommandStore.setState(useCommandStore.getInitialState()))

  it('registers a command', () => {
    useCommandStore.getState().registerCommand({
      id: 'test-cmd',
      label: 'Test Command',
      category: 'Navigation',
      action: () => {},
    })
    expect(useCommandStore.getState().commands).toHaveLength(1)
  })

  it('unregisters a command', () => {
    useCommandStore.getState().registerCommand({
      id: 'test-cmd',
      label: 'Test',
      category: 'Navigation',
      action: () => {},
    })
    useCommandStore.getState().unregisterCommand('test-cmd')
    expect(useCommandStore.getState().commands).toHaveLength(0)
  })
})

describe('Scene Store', () => {
  it('has default scenes', () => {
    expect(useSceneStore.getState().scenes.length).toBeGreaterThan(0)
  })
})

describe('Theme Store', () => {
  it('has default active theme', () => {
    expect(useThemeStore.getState().activeTheme).toBeDefined()
    expect(useThemeStore.getState().activeTheme.id).toBe('dark')
  })
})

describe('Onboarding Store', () => {
  beforeEach(() =>
    useOnboardingStore.setState(useOnboardingStore.getInitialState())
  )

  it('starts incomplete', () => {
    expect(useOnboardingStore.getState().isComplete).toBe(false)
  })

  it('tracks current step', () => {
    useOnboardingStore.getState().start()
    expect(useOnboardingStore.getState().currentStep).toBe(0)
  })
})
