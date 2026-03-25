import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the onboarding wizard on first launch', () => {
    render(<App />)
    expect(
      screen.getByText(/what are you building/i)
    ).toBeDefined()
  })
})
