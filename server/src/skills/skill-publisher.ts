import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import type { SkillManifest } from './types.js'

export interface PublishResult {
  ok: boolean
  prUrl?: string
  error?: string
}

const SAFE_ID_RE = /^[a-z0-9][a-z0-9-]*$/

export class SkillPublisher {
  async packageSkill(
    skillDir: string,
  ): Promise<{ manifest: SkillManifest; tarball: string }> {
    const manifestPath = path.join(skillDir, 'skill.yml')
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const manifest = yaml.load(raw, {
      schema: yaml.JSON_SCHEMA,
    }) as SkillManifest

    const files = await this.collectFiles(skillDir)
    const bundle: Record<string, string> = {}
    for (const file of files) {
      const rel = path.relative(skillDir, file)
      bundle[rel] = await fs.readFile(file, 'utf-8')
    }

    const tarball = JSON.stringify(bundle, null, 2)
    return { manifest, tarball }
  }

  async publishViaPR(
    skillDir: string,
    registryRepo: string = 'mrlfarano/mira-registry',
  ): Promise<PublishResult> {
    try {
      if (!/^[\w-]+\/[\w.-]+$/.test(registryRepo)) {
        return { ok: false, error: 'Invalid registry repository format' }
      }

      const { manifest, tarball } = await this.packageSkill(skillDir)

      if (!SAFE_ID_RE.test(manifest.id)) {
        return { ok: false, error: `Invalid skill ID: ${manifest.id}` }
      }

      const safeId = manifest.id
      const branch = `skill/${safeId}-${Date.now()}`
      const message = `feat: publish skill "${safeId}" v${manifest.version}`

      const ghAvailable = await this.checkGhCli()
      if (!ghAvailable) {
        return {
          ok: false,
          error:
            'GitHub CLI (gh) is required for publishing. Install it from https://cli.github.com',
        }
      }

      const tmpDir = `/tmp/mira-publish-${safeId}-${Date.now()}`
      execFileSync(
        'git',
        [
          'clone',
          '--depth',
          '1',
          `https://github.com/${registryRepo}.git`,
          tmpDir,
        ],
        { stdio: 'pipe', timeout: 30_000 },
      )

      execFileSync('git', ['checkout', '-b', branch], {
        cwd: tmpDir,
        stdio: 'pipe',
      })

      const skillsDir = path.join(tmpDir, 'skills')
      await fs.mkdir(skillsDir, { recursive: true })

      const skillJson = JSON.stringify(
        {
          id: safeId,
          name: manifest.name,
          description: manifest.description,
          author: manifest.author,
          category: 'skill' as const,
          stars: 0,
          configUrl: `https://raw.githubusercontent.com/${registryRepo}/main/skills/${safeId}.json`,
          version: manifest.version,
          tags: manifest.cornerstones,
        },
        null,
        2,
      )

      await fs.writeFile(
        path.join(skillsDir, `${safeId}.json`),
        skillJson,
        'utf-8',
      )
      await fs.writeFile(
        path.join(skillsDir, `${safeId}-bundle.json`),
        tarball,
        'utf-8',
      )

      execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' })
      execFileSync('git', ['commit', '-m', message], {
        cwd: tmpDir,
        stdio: 'pipe',
      })
      execFileSync('git', ['push', 'origin', branch], {
        cwd: tmpDir,
        stdio: 'pipe',
      })

      const body = `Automated skill publish for **${safeId}** v${manifest.version}.\n\n${manifest.description}`
      const prOutput = execFileSync(
        'gh',
        ['pr', 'create', '--title', message, '--body', body],
        { cwd: tmpDir, encoding: 'utf-8' },
      )

      await fs.rm(tmpDir, { recursive: true, force: true })

      return { ok: true, prUrl: prOutput.trim() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: msg }
    }
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await this.collectFiles(fullPath)))
      } else if (
        entry.name.endsWith('.yml') ||
        entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.json') ||
        entry.name.endsWith('.md') ||
        entry.name.endsWith('.txt')
      ) {
        files.push(fullPath)
      }
    }
    return files
  }

  private async checkGhCli(): Promise<boolean> {
    try {
      execFileSync('gh', ['--version'], { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }
}
