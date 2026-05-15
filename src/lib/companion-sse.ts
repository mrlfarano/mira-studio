export interface CompanionRequest {
  message: string
  sessionId?: string
}

export interface StreamOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

export async function streamCompanionReply(
  body: CompanionRequest,
  onChunk: (text: string) => void,
  opts: StreamOptions = {},
): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const res = await fetchImpl('/api/companion/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!res.ok) {
    throw new Error(`Companion SSE failed: ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('Companion SSE response had no body')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!dataLine) continue
      const payload = dataLine.slice('data: '.length).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload) as { text?: string }
        if (parsed.text) onChunk(parsed.text)
      } catch {
        // ignore malformed frames; server may emit keepalives
      }
    }
  }
}
