import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingAnswers {
  /** What the user is building (project type) */
  projectType: string | null;
  /** How the user likes to work (work style) */
  workStyle: string | null;
  /** Tools the user already uses */
  existingTools: string[];
  /** Optional free-form notes */
  freeform: string | null;
}

export interface OnboardingState {
  /** Current step index (0-based) */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** Collected answers */
  answers: OnboardingAnswers;

  /** Whether the wizard has been completed (or skipped) */
  isComplete: boolean;

  /** Timestamp when the wizard was started */
  startedAt: number | null;

  /** Timestamp when the wizard finished */
  completedAt: number | null;

  // --- actions ---
  start: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
  complete: () => void;
  skip: () => void;
  reset: () => void;

  /** Bulk-replace state -- used by hydration */
  _replace: (partial: Partial<OnboardingState>) => void;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "mira-onboarding";

function loadPersistedFlag(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { completed?: boolean };
      return parsed.completed === true;
    }
  } catch {
    // ignore
  }
  return false;
}

function persistFlag(completed: boolean): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completed, updatedAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;

const emptyAnswers: OnboardingAnswers = {
  projectType: null,
  workStyle: null,
  existingTools: [],
  freeform: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    (set) => ({
      currentStep: 0,
      totalSteps: TOTAL_STEPS,
      answers: { ...emptyAnswers },
      isComplete: loadPersistedFlag(),
      startedAt: null,
      completedAt: null,

      start: () =>
        set({ startedAt: Date.now(), currentStep: 0 }, undefined, "onboarding/start"),

      nextStep: () =>
        set(
          (s) => ({
            currentStep: Math.min(s.currentStep + 1, s.totalSteps - 1),
          }),
          undefined,
          "onboarding/nextStep",
        ),

      prevStep: () =>
        set(
          (s) => ({
            currentStep: Math.max(s.currentStep - 1, 0),
          }),
          undefined,
          "onboarding/prevStep",
        ),

      setAnswer: (key, value) =>
        set(
          (s) => ({
            answers: { ...s.answers, [key]: value },
          }),
          undefined,
          "onboarding/setAnswer",
        ),

      complete: () => {
        persistFlag(true);
        set(
          { isComplete: true, completedAt: Date.now() },
          undefined,
          "onboarding/complete",
        );
      },

      skip: () => {
        persistFlag(true);
        set(
          {
            isComplete: true,
            completedAt: Date.now(),
            answers: { ...emptyAnswers },
          },
          undefined,
          "onboarding/skip",
        );
      },

      reset: () => {
        persistFlag(false);
        set(
          {
            currentStep: 0,
            answers: { ...emptyAnswers },
            isComplete: false,
            startedAt: null,
            completedAt: null,
          },
          undefined,
          "onboarding/reset",
        );
      },

      _replace: (partial) => set(partial, undefined, "onboarding/_replace"),
    }),
    { name: "OnboardingStore", enabled: import.meta.env.DEV },
  ),
);
