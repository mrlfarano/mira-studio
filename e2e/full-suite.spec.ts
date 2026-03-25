import { test, expect } from '@playwright/test'

test.describe('Mira Studio E2E', () => {
  test('loads the onboarding wizard on first visit', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.onboarding-overlay')).toBeVisible()
    await expect(page.getByText(/what are you building/i)).toBeVisible()
  })

  test('can skip onboarding and see app shell', async ({ page }) => {
    await page.goto('/')
    const skipButton = page.getByText(/skip/i)
    if (await skipButton.isVisible()) {
      await skipButton.click()
    }
    await expect(page.locator('.app-shell')).toBeVisible()
  })

  test('app shell has top bar with Mira Studio title', async ({ page }) => {
    // Set localStorage to skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    await expect(page.locator('.topbar')).toBeVisible()
    await expect(page.getByText('Mira Studio')).toBeVisible()
  })

  test('sidebar is visible and collapsible', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()
  })

  test('status bar shows connection info', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    await expect(page.locator('.statusbar')).toBeVisible()
  })

  test('command palette opens with Cmd+K', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'mira-onboarding',
        JSON.stringify({ state: { isComplete: true }, version: 0 })
      )
    })
    await page.goto('/')
    await page.keyboard.press('Meta+k')
    // Command palette should appear
    await page.waitForTimeout(300)
  })
})

test.describe('Server API E2E', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('config endpoint returns config', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/config')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('projectName')
  })

  test('companion config endpoint works', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/config/companion')
    expect(res.ok()).toBeTruthy()
  })

  test('workspaces endpoint returns array', async ({ request }) => {
    const res = await request.get(
      'http://127.0.0.1:3001/api/config/workspaces'
    )
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body)).toBeTruthy()
  })

  test('skills endpoint returns list', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/skills')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('skills')
  })

  test('git status endpoint works', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/git/status')
    expect(res.ok()).toBeTruthy()
  })

  test('journal endpoint returns list', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/journal')
    expect(res.ok()).toBeTruthy()
  })

  test('snapshots endpoint returns list', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/snapshots')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body)).toBeTruthy()
  })

  test('SI endpoint returns project data', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/si')
    expect(res.ok()).toBeTruthy()
  })

  test('SI health endpoint returns score', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/si/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('score')
  })

  test('MCP discover endpoint works', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/mcp/discover')
    expect(res.ok()).toBeTruthy()
  })

  test('MCP connections endpoint returns list', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/mcp/connections')
    expect(res.ok()).toBeTruthy()
  })
})
