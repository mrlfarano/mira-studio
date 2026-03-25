import { describe, it, expect, afterAll } from 'vitest'
import Fastify from 'fastify'

describe('Health endpoint', () => {
  const server = Fastify()

  server.get('/api/health', async () => {
    return { status: 'ok' }
  })

  afterAll(async () => {
    await server.close()
  })

  it('returns 200 with status ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
