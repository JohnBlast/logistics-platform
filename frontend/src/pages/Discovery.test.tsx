import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Discovery } from './Discovery'
import { PipelineOutputProvider } from '../context/PipelineOutputContext'

vi.mock('../services/api', () => ({
  api: {
    health: { ai: vi.fn(() => Promise.resolve({ claudeAvailable: true })) },
    chat: vi.fn(),
  },
}))

describe('Discovery', () => {
  it('shows empty state when no pipeline output', async () => {
    // PipelineOutputProvider starts with null - Discovery will see empty
    render(
      <MemoryRouter>
        <PipelineOutputProvider>
          <Discovery />
        </PipelineOutputProvider>
      </MemoryRouter>
    )
    expect(await screen.findByText(/Add data and run pipeline in ETL to query/i)).toBeDefined()
    expect(screen.getByText(/Go to Simulate Pipeline/i)).toBeDefined()
  })
})
