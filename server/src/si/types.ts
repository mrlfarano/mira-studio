/**
 * TypeScript interfaces for the Self-Improvement (SI) system.
 *
 * Stored in .mira/project_SI.yml — tracks hypotheses, lessons learned,
 * and build outcomes across development cycles.
 */

// ---------------------------------------------------------------------------
// SI Hypothesis — a testable idea for improving the project
// ---------------------------------------------------------------------------

export interface SIHypothesis {
  id: string;
  title: string;
  description: string;
  /** Expected impact: low | medium | high */
  impact: "low" | "medium" | "high";
  /** Lifecycle status */
  status: "queued" | "testing" | "accepted" | "rejected";
  /** ISO date when the hypothesis was created */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// SI Lesson — insight captured from a build cycle
// ---------------------------------------------------------------------------

export interface SILesson {
  id: string;
  content: string;
  /** Who/what contributed this lesson */
  source: "mira" | "agent" | "user";
  /** ISO date */
  date: string;
  /** Optional link to a specific build cycle */
  cycleId?: string;
}

// ---------------------------------------------------------------------------
// SI Build — outcome record from a build/test cycle
// ---------------------------------------------------------------------------

export interface SIBuild {
  id: string;
  /** ISO date */
  date: string;
  /** Git branch (if applicable) */
  branch: string;
  /** Hypothesis being tested (ID reference) */
  hypothesis: string;
  /** Free-text outcome description */
  outcome: string;
  /** Summary of test results */
  testResults: string;
  /** Whether the build outcome was accepted as an improvement */
  accepted: boolean;
}

// ---------------------------------------------------------------------------
// ProjectSI — top-level shape of .mira/project_SI.yml
// ---------------------------------------------------------------------------

export interface ProjectSI {
  /** How often SI cycles run: daily | weekly | per-build */
  cadence: "daily" | "weekly" | "per-build";
  hypotheses: SIHypothesis[];
  lessons: SILesson[];
  builds: SIBuild[];
}

// ---------------------------------------------------------------------------
// SI Health Score
// ---------------------------------------------------------------------------

export interface SIHealth {
  /** Overall health score 0-100 */
  score: number;
  /** Number of builds in last 7 days */
  recentBuilds: number;
  /** Acceptance rate of recent builds (0-1) */
  acceptanceRate: number;
  /** Days since last SI activity */
  daysSinceLastActivity: number;
  /** Number of queued hypotheses */
  queuedHypotheses: number;
}
