import { type Page, type Locator } from '@playwright/test'

export class OnboardingPage {
  readonly overlay: Locator
  readonly skipButton: Locator
  readonly nextButton: Locator
  readonly backButton: Locator
  readonly step: Locator

  constructor(readonly page: Page) {
    this.overlay = page.getByTestId('onboarding-overlay')
    this.skipButton = page.getByTestId('onboarding-skip')
    this.nextButton = page.getByTestId('onboarding-next')
    this.backButton = page.getByTestId('onboarding-back')
    this.step = page.getByTestId('onboarding-step')
  }

  async waitForVisible() {
    await this.overlay.waitFor({ state: 'visible' })
  }

  async skip() {
    await this.skipButton.click()
    await this.overlay.waitFor({ state: 'hidden' })
  }

  async fillCurrentStep(text: string) {
    await this.step.locator('input').fill(text)
  }

  async clickNext() {
    await this.nextButton.click()
  }

  async clickBack() {
    await this.backButton.click()
  }

  async completeAllSteps() {
    await this.fillCurrentStep('A React web app')
    await this.clickNext()
    await this.fillCurrentStep('Minimal and focused')
    await this.clickNext()
    await this.fillCurrentStep('Git, VS Code')
    await this.clickNext()
    await this.clickNext()
    await this.overlay.waitFor({ state: 'hidden' })
  }
}
