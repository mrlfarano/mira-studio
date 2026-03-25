import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { ConfigEngine } from '../config/config-engine.js'

describe('ConfigEngine', () => {
  let tmpDir: string
  let engine: ConfigEngine

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mira-test-'))
    engine = new ConfigEngine(tmpDir)
  })

  afterEach(async () => {
    await engine.stop()
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('scaffolds .mira/ directory on init', async () => {
    await engine.ensureConfigDir()
    const configDir = path.join(tmpDir, '.mira')
    const stat = await fs.stat(configDir)
    expect(stat.isDirectory()).toBe(true)
  })

  it('creates default config.yml', async () => {
    await engine.ensureConfigDir()
    const configPath = path.join(tmpDir, '.mira', 'config.yml')
    const content = await fs.readFile(configPath, 'utf-8')
    expect(content).toContain('projectName')
  })

  it('loads and saves config', async () => {
    await engine.ensureConfigDir()
    const testData = { foo: 'bar', num: 42 }
    const filePath = path.join(tmpDir, '.mira', 'test.yml')
    await engine.saveConfig(filePath, testData)
    const loaded = await engine.loadConfig<typeof testData>(filePath)
    expect(loaded.foo).toBe('bar')
    expect(loaded.num).toBe(42)
  })

  it('returns config dir path', () => {
    expect(engine.getConfigDir()).toBe(path.join(tmpDir, '.mira'))
  })
})
