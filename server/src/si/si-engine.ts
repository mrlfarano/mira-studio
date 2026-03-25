/**
 * SIEngine — manages the Self-Improvement cycle stored in .mira/project_SI.yml.
 *
 * Reads and writes SI data (hypotheses, lessons, builds) and computes a
 * health score reflecting how actively the project is iterating.
 */

import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type {
  ProjectSI,
  SIHypothesis,
  SILesson,
  SIBuild,
  SIHealth,
} from "./types.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PROJECT_SI: ProjectSI = {
  cadence: "per-build",
  hypotheses: [],
  lessons: [],
  builds: [],
};

// ---------------------------------------------------------------------------
// SIEngine
// ---------------------------------------------------------------------------

export class SIEngine {
  private projectRoot: string;
  private data: ProjectSI | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  // -----------------------------------------------------------------------
  // Paths
  // -----------------------------------------------------------------------

  private get filePath(): string {
    return path.join(this.projectRoot, ".mira", "project_SI.yml");
  }

  // -----------------------------------------------------------------------
  // Load / Save
  // -----------------------------------------------------------------------

  /**
   * Load project_SI.yml from disk.
   * Creates the file with defaults if it does not exist.
   */
  async loadProjectSI(): Promise<ProjectSI> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      this.data = (yaml.load(raw) as ProjectSI) ?? { ...DEFAULT_PROJECT_SI };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.data = { ...DEFAULT_PROJECT_SI };
        await this.saveProjectSI();
      } else {
        throw err;
      }
    }

    // Ensure arrays exist even if YAML was partial
    this.data!.hypotheses ??= [];
    this.data!.lessons ??= [];
    this.data!.builds ??= [];
    this.data!.cadence ??= "per-build";

    return this.data!;
  }

  /** Write current in-memory data back to .mira/project_SI.yml */
  async saveProjectSI(): Promise<void> {
    if (!this.data) return;
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const content = yaml.dump(this.data, { lineWidth: 120, noRefs: true });
    await fs.writeFile(this.filePath, content, "utf-8");
  }

  /** Return the current in-memory data (loads if necessary) */
  async getData(): Promise<ProjectSI> {
    if (!this.data) {
      await this.loadProjectSI();
    }
    return this.data!;
  }

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  /** Add a hypothesis and persist */
  async addHypothesis(
    input: Omit<SIHypothesis, "id" | "createdAt">,
  ): Promise<SIHypothesis> {
    const data = await this.getData();
    const hypothesis: SIHypothesis = {
      ...input,
      id: `hyp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    data.hypotheses.push(hypothesis);
    await this.saveProjectSI();
    return hypothesis;
  }

  /** Add a lesson and persist */
  async addLesson(
    input: Omit<SILesson, "id" | "date">,
  ): Promise<SILesson> {
    const data = await this.getData();
    const lesson: SILesson = {
      ...input,
      id: `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
    };
    data.lessons.push(lesson);
    await this.saveProjectSI();
    return lesson;
  }

  /** Record a build outcome and persist */
  async recordBuild(
    input: Omit<SIBuild, "id" | "date">,
  ): Promise<SIBuild> {
    const data = await this.getData();
    const build: SIBuild = {
      ...input,
      id: `bld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
    };
    data.builds.push(build);

    // Update hypothesis status based on build acceptance
    const hyp = data.hypotheses.find((h) => h.id === input.hypothesis);
    if (hyp && hyp.status === "testing") {
      hyp.status = input.accepted ? "accepted" : "rejected";
    }

    await this.saveProjectSI();
    return build;
  }

  // -----------------------------------------------------------------------
  // Health Score
  // -----------------------------------------------------------------------

  /**
   * Compute an SI health score based on:
   *  - Recent build activity (last 7 days)
   *  - Acceptance rate of recent builds
   *  - Freshness (days since last activity)
   *  - Queued hypothesis count
   */
  async getHealth(): Promise<SIHealth> {
    const data = await this.getData();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Recent builds (last 7 days)
    const recentBuilds = data.builds.filter(
      (b) => new Date(b.date).getTime() >= sevenDaysAgo,
    );
    const recentBuildCount = recentBuilds.length;

    // Acceptance rate
    const acceptanceRate =
      recentBuildCount > 0
        ? recentBuilds.filter((b) => b.accepted).length / recentBuildCount
        : 0;

    // Days since last activity (build or lesson)
    const allDates = [
      ...data.builds.map((b) => new Date(b.date).getTime()),
      ...data.lessons.map((l) => new Date(l.date).getTime()),
    ];
    const lastActivity = allDates.length > 0 ? Math.max(...allDates) : 0;
    const daysSinceLastActivity =
      lastActivity > 0
        ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
        : 999;

    // Queued hypotheses
    const queuedHypotheses = data.hypotheses.filter(
      (h) => h.status === "queued",
    ).length;

    // Score calculation (0-100)
    let score = 0;

    // Activity component (0-40): more recent builds = higher
    score += Math.min(recentBuildCount * 10, 40);

    // Acceptance component (0-25): higher acceptance = healthier
    score += Math.round(acceptanceRate * 25);

    // Freshness component (0-20): fewer days since last activity = better
    if (daysSinceLastActivity === 0) score += 20;
    else if (daysSinceLastActivity <= 1) score += 15;
    else if (daysSinceLastActivity <= 3) score += 10;
    else if (daysSinceLastActivity <= 7) score += 5;

    // Pipeline component (0-15): having queued hypotheses means the pipeline is fed
    score += Math.min(queuedHypotheses * 5, 15);

    return {
      score: Math.min(score, 100),
      recentBuilds: recentBuildCount,
      acceptanceRate,
      daysSinceLastActivity,
      queuedHypotheses,
    };
  }
}
