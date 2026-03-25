import { describe, it, expect } from 'vitest'
import { getTogglesForProfile } from '../lib/profile-presets'

describe('Profile Presets', () => {
  it('Minimal enables only terminal and companion', () => {
    const toggles = getTogglesForProfile('Minimal')
    expect(toggles.terminal).toBe(true)
    expect(toggles.companion).toBe(true)
    expect(toggles.kanban).toBe(false)
  })

  it('Full Send enables everything', () => {
    const toggles = getTogglesForProfile('FullSend')
    expect(Object.values(toggles).every(Boolean)).toBe(true)
  })

  it('Balanced enables terminal, kanban, companion, notifications', () => {
    const toggles = getTogglesForProfile('Balanced')
    expect(toggles.terminal).toBe(true)
    expect(toggles.kanban).toBe(true)
    expect(toggles.companion).toBe(true)
    expect(toggles.notifications).toBe(true)
  })
})
