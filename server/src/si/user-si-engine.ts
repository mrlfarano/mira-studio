import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import type {
  UserSI,
  UserSILesson,
  UserSISkill,
  UserSIProjectSnapshot,
  UserGrowthMetrics,
} from './types.js'

const DEFAULT_USER_SI: UserSI = {
  version: 1,
  crossProjectLessons: [],
  skillsDeveloped: [],
  projectSnapshots: [],
  growthMetrics: {
    totalProjectsWorked: 0,
    totalBuildsAcrossProjects: 0,
    averageAcceptanceRate: 0,
    totalLessonsLearned: 0,
    longestStreakDays: 0,
    currentStreakDays: 0,
    skillsCount: 0,
  },
  lastSyncedAt: new Date().toISOString(),
}

export class UserSIEngine {
  private data: UserSI | null = null
  private readonly userMiraDir: string
  private readonly filePath: string

  constructor() {
    this.userMiraDir = path.join(os.homedir(), '.mira')
    this.filePath = path.join(this.userMiraDir, 'user_SI.yml')
  }

  private get defaultData(): UserSI {
    return { ...DEFAULT_USER_SI, lastSyncedAt: new Date().toISOString() }
  }

  async load(): Promise<UserSI> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8')
      this.data = (yaml.load(raw) as UserSI) ?? this.defaultData
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.data = this.defaultData
        await this.save()
      } else {
        throw err
      }
    }

    this.data!.crossProjectLessons ??= []
    this.data!.skillsDeveloped ??= []
    this.data!.projectSnapshots ??= []
    this.data!.growthMetrics ??= DEFAULT_USER_SI.growthMetrics

    return this.data!
  }

  async save(): Promise<void> {
    if (!this.data) return
    await fs.mkdir(this.userMiraDir, { recursive: true })
    const content = yaml.dump(this.data, { lineWidth: 120, noRefs: true })
    await fs.writeFile(this.filePath, content, 'utf-8')
  }

  async getData(): Promise<UserSI> {
    if (!this.data) await this.load()
    return this.data!
  }

  async addCrossProjectLesson(
    input: Omit<UserSILesson, 'id'>,
  ): Promise<UserSILesson> {
    const data = await this.getData()
    const lesson: UserSILesson = {
      ...input,
      id: `ules-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }
    data.crossProjectLessons.push(lesson)
    data.growthMetrics.totalLessonsLearned = data.crossProjectLessons.length
    await this.save()
    return lesson
  }

  async upsertSkill(name: string, projectName: string): Promise<UserSISkill> {
    const data = await this.getData()
    const now = new Date().toISOString()
    let skill = data.skillsDeveloped.find((s) => s.name === name)

    if (skill) {
      skill.lastPracticed = now
      if (!skill.projects.includes(projectName)) {
        skill.projects.push(projectName)
      }
    } else {
      skill = {
        name,
        level: 'beginner',
        projects: [projectName],
        firstSeen: now,
        lastPracticed: now,
      }
      data.skillsDeveloped.push(skill)
    }

    data.growthMetrics.skillsCount = data.skillsDeveloped.length
    await this.save()
    return skill
  }

  async updateProjectSnapshot(
    snapshot: Omit<UserSIProjectSnapshot, 'lastSyncedAt'>,
  ): Promise<UserSIProjectSnapshot> {
    const data = await this.getData()
    const now = new Date().toISOString()
    const idx = data.projectSnapshots.findIndex(
      (s) => s.projectPath === snapshot.projectPath,
    )

    const entry: UserSIProjectSnapshot = { ...snapshot, lastSyncedAt: now }

    if (idx >= 0) {
      data.projectSnapshots[idx] = entry
    } else {
      data.projectSnapshots.push(entry)
    }

    this.recomputeMetrics(data)
    await this.save()
    return entry
  }

  async getGrowthMetrics(): Promise<UserGrowthMetrics> {
    const data = await this.getData()
    return data.growthMetrics
  }

  private recomputeMetrics(data: UserSI): void {
    const snaps = data.projectSnapshots
    data.growthMetrics.totalProjectsWorked = snaps.length
    data.growthMetrics.totalBuildsAcrossProjects = snaps.reduce(
      (sum, s) => sum + s.totalBuilds,
      0,
    )
    data.growthMetrics.averageAcceptanceRate =
      snaps.length > 0
        ? snaps.reduce((sum, s) => sum + s.acceptanceRate, 0) / snaps.length
        : 0
    data.growthMetrics.totalLessonsLearned = data.crossProjectLessons.length
    data.growthMetrics.skillsCount = data.skillsDeveloped.length
    data.lastSyncedAt = new Date().toISOString()
  }
}
