import { test, expect } from '@playwright/test'
import { OnboardingPage } from '../pages/OnboardingPage'
import { AppShell } from '../pages/AppShell'

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('mira-onboarding')
    })
    await page.goto('/')
  })

  test('shows the onboarding wizard on first visit', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.waitForVisible()
    await expect(onboarding.overlay).toBeVisible()
  })

  test('displays step content on each step', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.waitForVisible()
    await expect(onboarding.step).toBeVisible()
  })

  test('back button navigates to the previous step', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    await onboarding.waitForVisible()
    await onboarding.clickNext()
    await expect(onboarding.backButton).toBeVisible()
    await onboarding.clickBack()
    await expect(onboarding.step).toBeVisible()
  })

  test('skip button dismisses wizard and shows app shell', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    await onboarding.waitForVisible()
    await onboarding.skip()
    await expect(onboarding.overlay).toBeHidden()
    await shell.waitForReady()
    await expect(shell.layoutEngine).toBeVisible()
  })

  test('completing all steps dismisses wizard and persists isComplete', async ({ page }) => {
    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    await onboarding.waitForVisible()
    await onboarding.completeAllSteps()
    await expect(onboarding.overlay).toBeHidden()
    await shell.waitForReady()
    const stored = await page.evaluate(() => localStorage.getItem('mira-onboarding'))
    const state = JSON.parse(stored ?? '{}') as { completed: boolean }
    expect(state.completed).toBe(true)
  })

  test('re-visiting after completion skips wizard entirely', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ completed: true, updatedAt: Date.now() })
      )
    })
    await page.goto('/')
    const onboarding = new OnboardingPage(page)
    const shell = new AppShell(page)
    await shell.waitForReady()
    await expect(onboarding.overlay).toBeHidden()
  })
})
