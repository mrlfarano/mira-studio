import { describe, it, expect, vi } from 'vitest'
import { generateCardsFromText } from '../card-generator.js'
import type { CompanionEngine } from '../companion-engine.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake CompanionEngine whose chat() yields a single string chunk. */
function makeEngine(responseText: string): CompanionEngine {
  async function* fakeChat() {
    yield responseText
  }
  return {
    chat: vi.fn().mockReturnValue(fakeChat()),
  } as unknown as CompanionEngine
}

// ---------------------------------------------------------------------------
// Happy-path
// ---------------------------------------------------------------------------

describe('generateCardsFromText — happy path', () => {
  it('returns degraded=false when LLM returns valid JSON array', async () => {
    const cards = [
      {
        title: 'Fix the login bug',
        description: 'The login flow fails for OAuth users.',
        priority: 'high',
        context: [],
      },
    ]
    const engine = makeEngine(JSON.stringify(cards))

    const result = await generateCardsFromText(engine, 'Fix login bug')

    expect(result.degraded).toBe(false)
    expect(result.degradationReason).toBeUndefined()
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].title).toBe('Fix the login bug')
  })
})

// ---------------------------------------------------------------------------
// Degradation cases
// ---------------------------------------------------------------------------

describe('generateCardsFromText degradation', () => {
  it('sets degraded=true and includes reason when LLM returns non-JSON', async () => {
    const engine = makeEngine('not json at all')

    const result = await generateCardsFromText(engine, 'some text')

    expect(result.degraded).toBe(true)
    expect(result.degradationReason).toMatch(/parse/i)
    expect(result.cards.length).toBeGreaterThan(0)
  })

  it('sets degraded=true when LLM returns JSON that is not an array', async () => {
    const engine = makeEngine('{"error": "no tasks"}')

    const result = await generateCardsFromText(engine, 'some text')

    expect(result.degraded).toBe(true)
    expect(result.degradationReason).toMatch(/parse/i)
    expect(result.cards.length).toBeGreaterThan(0)
  })

  it('sets degraded=true when LLM returns an empty array', async () => {
    const engine = makeEngine('[]')

    const result = await generateCardsFromText(engine, 'some text')

    expect(result.degraded).toBe(true)
    expect(result.degradationReason).toMatch(/parse/i)
    expect(result.cards.length).toBeGreaterThan(0)
  })

  it('falls back to Review-notes card when degraded', async () => {
    const engine = makeEngine('not json at all')

    const result = await generateCardsFromText(engine, 'my brain dump text')

    expect(result.degraded).toBe(true)
    expect(result.cards[0].title).toBe('Review notes')
  })
})
