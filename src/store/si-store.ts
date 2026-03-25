import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types (mirror server types for the client)
// ---------------------------------------------------------------------------

export interface SIHypothesis {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'queued' | 'testing' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface SILesson {
  id: string;
  content: string;
  source: 'mira' | 'agent' | 'user';
  date: string;
  cycleId?: string;
}

export interface SIBuild {
  id: string;
  date: string;
  branch: string;
  hypothesis: string;
  outcome: string;
  testResults: string;
  accepted: boolean;
}

export interface SIHealth {
  score: number;
  recentBuilds: number;
  acceptanceRate: number;
  daysSinceLastActivity: number;
  queuedHypotheses: number;
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface SIState {
  hypotheses: SIHypothesis[];
  lessons: SILesson[];
  builds: SIBuild[];
  health: SIHealth | null;
  loading: boolean;
  error: string | null;

  // --- actions ---
  fetchAll: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  addHypothesis: (input: Pick<SIHypothesis, 'title' | 'description' | 'impact' | 'status'>) => Promise<void>;
  addLesson: (input: Pick<SILesson, 'content' | 'source' | 'cycleId'>) => Promise<void>;
}

const API_BASE = 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSIStore = create<SIState>()(
  devtools(
    (set) => ({
      hypotheses: [],
      lessons: [],
      builds: [],
      health: null,
      loading: false,
      error: null,

      fetchAll: async () => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/si`);
          if (!res.ok) throw new Error(`Failed to fetch SI data: ${res.status}`);
          const data = await res.json();
          set({
            hypotheses: data.hypotheses ?? [],
            lessons: data.lessons ?? [],
            builds: data.builds ?? [],
            loading: false,
          });
        } catch (err) {
          set({ error: (err as Error).message, loading: false });
        }
      },

      fetchHealth: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/si/health`);
          if (!res.ok) throw new Error(`Failed to fetch SI health: ${res.status}`);
          const health = await res.json();
          set({ health });
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },

      addHypothesis: async (input) => {
        try {
          const res = await fetch(`${API_BASE}/api/si/hypotheses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) throw new Error(`Failed to add hypothesis: ${res.status}`);
          const hypothesis = await res.json();
          set((state) => ({ hypotheses: [...state.hypotheses, hypothesis] }));
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },

      addLesson: async (input) => {
        try {
          const res = await fetch(`${API_BASE}/api/si/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) throw new Error(`Failed to add lesson: ${res.status}`);
          const lesson = await res.json();
          set((state) => ({ lessons: [...state.lessons, lesson] }));
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },
    }),
    { name: 'si-store' },
  ),
);
