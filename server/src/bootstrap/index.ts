import type { FastifyInstance } from 'fastify'
import { EnvironmentBootstrap } from './environment-bootstrap.js'

export { EnvironmentBootstrap } from './environment-bootstrap.js'
export type * from './environment-bootstrap.js'

export async function registerBootstrapRoutes(
  server: FastifyInstance,
  projectRoot: string,
): Promise<EnvironmentBootstrap> {
  const bootstrap = new EnvironmentBootstrap(projectRoot)

  server.get('/api/bootstrap/detect', async () => {
    const detection = await bootstrap.detect()
    return detection
  })

  server.post('/api/bootstrap/start', async () => {
    const result = await bootstrap.startEnvironment()
    return result
  })

  server.post('/api/bootstrap/stop', async () => {
    await bootstrap.stopEnvironment()
    return { ok: true }
  })

  server.get('/api/bootstrap/status', async () => {
    const statuses = await bootstrap.getServiceStatuses()
    return { services: statuses }
  })

  server.get('/api/bootstrap/health', async () => {
    const health = await bootstrap.healthCheck()
    return health
  })

  return bootstrap
}
