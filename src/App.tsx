import { useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import OnboardingWizard from '@/components/OnboardingWizard'
import { useLayoutStore } from '@/store/layout-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { hydrateStores } from '@/store/hydrate'
import { useAgentCardSync } from '@/hooks/useAgentCardSync'

function App() {
  const addPanel = useLayoutStore((s) => s.addPanel)
  const hydrated = useRef(false)
  const onboardingComplete = useOnboardingStore((s) => s.isComplete)

  // Sync kanban cards with agent session status (auto-move to done)
  useAgentCardSync()

  // Hydrate stores on mount
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    hydrateStores().catch((err) => {
      console.warn('[App] Store hydration failed:', err)
    })
  }, [])

  // Seed default panels on first mount when store is empty
  // (only if onboarding was already completed -- the wizard handles layout otherwise)
  // Read panels.length directly from the store (not from the closure) so React Strict Mode's
  // double-invocation doesn't bypass the guard with a stale panels=[] snapshot.
  useEffect(() => {
    if (!onboardingComplete) return
    if (useLayoutStore.getState().panels.length > 0) return

    addPanel({
      id: 'terminal-1',
      type: 'terminal',
      title: 'Terminal',
      x: 0,
      y: 0,
      w: 6,
      h: 4,
    })

    addPanel({
      id: 'companion-1',
      type: 'companion',
      title: 'Mira Companion',
      x: 6,
      y: 0,
      w: 4,
      h: 4,
    })
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingComplete])

  // Show onboarding wizard on first launch
  if (!onboardingComplete) {
    return <OnboardingWizard />
  }

  return <AppShell />
}

export default App
