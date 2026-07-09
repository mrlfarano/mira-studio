import type { FastifyInstance } from 'fastify'
import { KeychainStore } from './keychain-store.js'

export { KeychainStore } from './keychain-store.js'

export async function registerKeychainRoutes(
  server: FastifyInstance,
): Promise<KeychainStore> {
  const store = new KeychainStore()

  server.get('/api/keychain', async () => {
    const accounts = await store.listAccounts()
    return { credentials: accounts.map((a) => ({ account: a })) }
  })

  server.post<{ Body: { account: string; secret: string } }>(
    '/api/keychain',
    async (req, reply) => {
      const { account, secret } = req.body
      if (!account || !secret) {
        return reply
          .status(400)
          .send({ error: 'account and secret are required' })
      }
      await store.set(account, secret)
      return { ok: true, account }
    },
  )

  server.delete<{ Params: { account: string } }>(
    '/api/keychain/:account',
    async (req) => {
      const { account } = req.params
      const deleted = await store.delete(account)
      return { ok: deleted, account }
    },
  )

  return store
}
