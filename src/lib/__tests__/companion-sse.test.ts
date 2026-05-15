import { describe, it, expect, vi } from 'vitest'
import { streamCompanionReply } from '../companion-sse'

function mockSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('streamCompanionReply', () => {
  it('aggregates text chunks from SSE frames', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockSseResponse([
        'data: {"text":"Hello"}\n\n',
        'data: {"text":" world"}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const chunks: string[] = []
    await streamCompanionReply(
      { message: 'hi' },
      (chunk) => chunks.push(chunk),
      { fetchImpl: fetchMock },
    )
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('throws on non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }))
    await expect(
      streamCompanionReply({ message: 'hi' }, () => {}, { fetchImpl: fetchMock }),
    ).rejects.toThrow(/500/)
  })
})
