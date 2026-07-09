import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface ServiceStatus {
  name: string
  type: 'docker' | 'process' | 'database'
  status: 'running' | 'stopped' | 'error' | 'unknown'
  port?: number
  health?: string
}

export interface EnvironmentDetection {
  hasDockerCompose: boolean
  hasPackageJson: boolean
  hasEnvExample: boolean
  hasSeedScript: boolean
  hasMakefile: boolean
  hasProcfile: boolean
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown'
  dockerServices: DockerService[]
  nodeScripts: Record<string, string>
  requiredEnvVars: string[]
  databases: DatabaseConfig[]
  procfileEntries: ProcfileEntry[]
}

export interface DockerService {
  name: string
  image?: string
  ports: number[]
  dependsOn: string[]
  environment: Record<string, string>
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'sqlite'
  host: string
  port: number
  name: string
  seedCommand?: string
}

export interface ProcfileEntry {
  name: string
  command: string
}

export class EnvironmentBootstrap extends EventEmitter {
  private projectRoot: string
  private serviceStatuses = new Map<string, ServiceStatus>()

  constructor(projectRoot: string) {
    super()
    this.projectRoot = projectRoot
  }

  async detect(): Promise<EnvironmentDetection> {
    const results: EnvironmentDetection = {
      hasDockerCompose: false,
      hasPackageJson: false,
      hasEnvExample: false,
      hasSeedScript: false,
      hasMakefile: false,
      hasProcfile: false,
      packageManager: 'unknown',
      dockerServices: [],
      nodeScripts: {},
      requiredEnvVars: [],
      databases: [],
      procfileEntries: [],
    }

    results.hasPackageJson = await this.fileExists('package.json')
    results.hasDockerCompose =
      (await this.fileExists('docker-compose.yml')) ||
      (await this.fileExists('docker-compose.yaml')) ||
      (await this.fileExists('compose.yml')) ||
      (await this.fileExists('compose.yaml'))
    results.hasEnvExample =
      (await this.fileExists('.env.example')) ||
      (await this.fileExists('.env.sample'))
    results.hasMakefile = await this.fileExists('Makefile')
    results.hasProcfile = await this.fileExists('Procfile')

    if (results.hasPackageJson) {
      await this.parsePackageJson(results)
    }

    if (results.hasDockerCompose) {
      await this.parseDockerCompose(results)
    }

    if (results.hasEnvExample) {
      await this.parseEnvExample(results)
    }

    if (results.hasProcfile) {
      await this.parseProcfile(results)
    }

    return results
  }

  async startEnvironment(): Promise<{
    started: string[]
    failed: { service: string; error: string }[]
  }> {
    const detection = await this.detect()
    const started: string[] = []
    const failed: { service: string; error: string }[] = []

    if (detection.hasDockerCompose) {
      try {
        const composeFile = await this.findComposeFile()
        if (composeFile) {
          await execFileAsync(
            'docker',
            ['compose', '-f', composeFile, 'up', '-d'],
            {
              cwd: this.projectRoot,
              timeout: 120_000,
            },
          )
          for (const svc of detection.dockerServices) {
            started.push(svc.name)
            this.serviceStatuses.set(svc.name, {
              name: svc.name,
              type: 'docker',
              status: 'running',
              port: svc.ports[0],
            })
          }
          this.emit('environment:started', { services: started })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        failed.push({ service: 'docker-compose', error: msg })
      }
    }

    for (const db of detection.databases) {
      if (db.seedCommand && detection.hasSeedScript) {
        try {
          const [cmd, ...args] = this.parseSeedCommand(db.seedCommand)
          await execFileAsync(cmd, args, {
            cwd: this.projectRoot,
            timeout: 60_000,
          })
          started.push(`seed-${db.type}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          failed.push({ service: `seed-${db.type}`, error: msg })
        }
      }
    }

    if (detection.hasEnvExample) {
      await this.ensureEnvFile()
    }

    if (detection.hasPackageJson && detection.nodeScripts['dev']) {
      this.emit('environment:ready', {
        hint: "Run 'npm run dev' (or the detected start command) to launch the dev server",
      })
    }

    return { started, failed }
  }

  async stopEnvironment(): Promise<void> {
    const detection = await this.detect()
    if (detection.hasDockerCompose) {
      try {
        const composeFile = await this.findComposeFile()
        if (composeFile) {
          await execFileAsync(
            'docker',
            ['compose', '-f', composeFile, 'down'],
            {
              cwd: this.projectRoot,
              timeout: 60_000,
            },
          )
        }
      } catch {
        // best effort
      }
    }
    this.serviceStatuses.clear()
    this.emit('environment:stopped')
  }

  async getServiceStatuses(): Promise<ServiceStatus[]> {
    const detection = await this.detect()
    if (detection.hasDockerCompose) {
      await this.refreshDockerStatuses()
    }
    return Array.from(this.serviceStatuses.values())
  }

  async healthCheck(): Promise<{
    healthy: boolean
    services: ServiceStatus[]
  }> {
    const services = await this.getServiceStatuses()
    const healthy = services.every(
      (s) => s.status === 'running' || s.status === 'unknown',
    )
    return { healthy, services }
  }

  private async refreshDockerStatuses(): Promise<void> {
    try {
      const { stdout } = await execFileAsync(
        'docker',
        ['compose', 'ps', '--format', 'json'],
        { cwd: this.projectRoot, timeout: 10_000 },
      )

      const lines = stdout.trim().split('\n')
      for (const line of lines) {
        try {
          const svc = JSON.parse(line) as {
            Name?: string
            State?: string
            Ports?: string
          }
          if (svc.Name) {
            this.serviceStatuses.set(svc.Name, {
              name: svc.Name,
              type: 'docker',
              status: svc.State === 'running' ? 'running' : 'stopped',
            })
          }
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // Docker not available or no compose file
    }
  }

  private parseSeedCommand(cmd: string): string[] {
    const parts = cmd.split(/\s+/)
    if (
      parts[0] === 'npm' ||
      parts[0] === 'yarn' ||
      parts[0] === 'pnpm' ||
      parts[0] === 'bun'
    ) {
      return parts
    }
    return [cmd]
  }

  private async ensureEnvFile(): Promise<void> {
    const envPath = path.join(this.projectRoot, '.env')
    const examplePath = (await fs.readdir(this.projectRoot)).find(
      (f) => f === '.env.example' || f === '.env.sample',
    )

    if (!examplePath) return

    try {
      await fs.access(envPath)
    } catch {
      const example = path.join(this.projectRoot, examplePath)
      await fs.copyFile(example, envPath)
      this.emit('env:created', { path: envPath })
    }
  }

  private async parsePackageJson(results: EnvironmentDetection): Promise<void> {
    try {
      const raw = await fs.readFile(
        path.join(this.projectRoot, 'package.json'),
        'utf-8',
      )
      const pkg = JSON.parse(raw) as {
        scripts?: Record<string, string>
        packageManager?: string
      }

      results.nodeScripts = pkg.scripts ?? {}
      results.hasSeedScript = !!(
        pkg.scripts?.['seed'] || pkg.scripts?.['db:seed']
      )

      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith('yarn'))
          results.packageManager = 'yarn'
        else if (pkg.packageManager.startsWith('pnpm'))
          results.packageManager = 'pnpm'
        else if (pkg.packageManager.startsWith('bun'))
          results.packageManager = 'bun'
      }

      if (results.packageManager === 'unknown') {
        if (await this.fileExists('yarn.lock')) results.packageManager = 'yarn'
        else if (await this.fileExists('pnpm-lock.yaml'))
          results.packageManager = 'pnpm'
        else if (await this.fileExists('bun.lockb'))
          results.packageManager = 'bun'
        else results.packageManager = 'npm'
      }
    } catch {
      // Malformed package.json
    }
  }

  private async parseDockerCompose(
    results: EnvironmentDetection,
  ): Promise<void> {
    const composeFile = await this.findComposeFile()
    if (!composeFile) return

    try {
      const raw = await fs.readFile(
        path.join(this.projectRoot, composeFile),
        'utf-8',
      )
      const servicesMatch = raw.match(
        /services:\s*\n((?:\s{2}\S[\s\S]*?)(?=\n\S|\n$|$))/,
      )
      if (!servicesMatch) return

      const serviceBlocks = servicesMatch[1].split(/\n(?=\S)/)
      for (const block of serviceBlocks) {
        const nameMatch = block.match(/^(\w[\w-]*)/)
        if (!nameMatch) continue

        const name = nameMatch[1]
        const ports: number[] = []
        const dependsOn: string[] = []
        const environment: Record<string, string> = {}
        let image: string | undefined

        const imageMatch = block.match(/image:\s*["']?([^"'\n]+)/)
        if (imageMatch) image = imageMatch[1].trim()

        const portMatches = block.matchAll(/-\s*["']?(?:\d+:)?(\d+)/g)
        for (const pm of portMatches) {
          ports.push(Number(pm[1]))
        }

        const dependsMatch = block.match(/depends_on:\s*\n((?:\s+-\s+\S+\n?)+)/)
        if (dependsMatch) {
          const deps = dependsMatch[1].matchAll(/-\s+(\S+)/g)
          for (const d of deps) dependsOn.push(d[1])
        }

        const envMatches = block.matchAll(/-\s+(\w+)(?:=|:\s*)["']?([^"'\n]*)/g)
        for (const em of envMatches) {
          environment[em[1]] = em[2].trim()
        }

        const dbType = this.inferDatabaseType(image ?? '')
        if (dbType) {
          results.databases.push({
            type: dbType,
            host: 'localhost',
            port: ports[0] ?? this.defaultPort(dbType),
            name:
              environment.POSTGRES_DB ?? environment.MYSQL_DATABASE ?? dbType,
            seedCommand: results.hasSeedScript
              ? `${results.packageManager} run seed`
              : undefined,
          })
        }

        results.dockerServices.push({
          name,
          image,
          ports,
          dependsOn,
          environment,
        })
      }
    } catch {
      // Malformed compose file
    }
  }

  private async parseEnvExample(results: EnvironmentDetection): Promise<void> {
    try {
      const exampleName = (await fs.readdir(this.projectRoot)).find(
        (f) => f === '.env.example' || f === '.env.sample',
      )
      if (!exampleName) return

      const raw = await fs.readFile(
        path.join(this.projectRoot, exampleName),
        'utf-8',
      )
      const vars = raw.matchAll(/^(\w+)(?:=|$)/gm)
      for (const v of vars) {
        results.requiredEnvVars.push(v[1])
      }
    } catch {
      // Can't read env example
    }
  }

  private async parseProcfile(results: EnvironmentDetection): Promise<void> {
    try {
      const raw = await fs.readFile(
        path.join(this.projectRoot, 'Procfile'),
        'utf-8',
      )
      for (const line of raw.split('\n')) {
        const match = line.match(/^(\w+):\s*(.+)/)
        if (match) {
          results.procfileEntries.push({
            name: match[1],
            command: match[2].trim(),
          })
        }
      }
    } catch {
      // Can't read Procfile
    }
  }

  private async findComposeFile(): Promise<string | null> {
    for (const name of [
      'docker-compose.yml',
      'docker-compose.yaml',
      'compose.yml',
      'compose.yaml',
    ]) {
      if (await this.fileExists(name)) return name
    }
    return null
  }

  private async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, relativePath))
      return true
    } catch {
      return false
    }
  }

  private inferDatabaseType(image: string): DatabaseConfig['type'] | null {
    const lower = image.toLowerCase()
    if (lower.includes('postgres')) return 'postgres'
    if (lower.includes('mysql')) return 'mysql'
    if (lower.includes('mongo')) return 'mongodb'
    if (lower.includes('redis')) return 'redis'
    return null
  }

  private defaultPort(type: DatabaseConfig['type']): number {
    switch (type) {
      case 'postgres':
        return 5432
      case 'mysql':
        return 3306
      case 'mongodb':
        return 27017
      case 'redis':
        return 6379
      case 'sqlite':
        return 0
    }
  }
}
