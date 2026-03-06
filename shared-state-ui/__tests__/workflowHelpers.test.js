import { describe, it, expect } from 'vitest'
import {
  buildConversationMemory,
  extractStepResults,
  getCurrentStep,
} from '../app/utils/workflowHelpers'

const step1 = {
  stepId: 'step_1',
  stepNumber: 1,
  questionSummary: 'Where do you want to go?',
  inputs: [{ id: 'destination', type: 'text_input', label: 'Destination' }],
  response: { destination: 'Rome' },
}

const step2 = {
  stepId: 'step_2',
  stepNumber: 2,
  questionSummary: 'When do you want to travel?',
  inputs: [{ id: 'date', type: 'date_input', label: 'Travel Date' }],
  response: null,
}

const step3 = {
  stepId: 'step_3',
  stepNumber: 3,
  questionSummary: 'What is your budget?',
  inputs: [{ id: 'budget', type: 'number_input', label: 'Budget' }],
  response: { budget: 500 },
}

describe('buildConversationMemory', () => {
  it('returns empty string for null input', () => {
    expect(buildConversationMemory(null)).toBe('')
  })

  it('returns empty string for empty array', () => {
    expect(buildConversationMemory([])).toBe('')
  })

  it('formats a single step with response', () => {
    const result = buildConversationMemory([step1])
    expect(result).toBe(
      'Step 1 Question: Where do you want to go?\nStep 1 Response: {"destination":"Rome"}'
    )
  })

  it('formats a step without response (only question line)', () => {
    const result = buildConversationMemory([step2])
    expect(result).toBe('Step 2 Question: When do you want to travel?')
  })

  it('formats multiple steps joined by newlines', () => {
    const result = buildConversationMemory([step1, step2])
    expect(result).toBe(
      'Step 1 Question: Where do you want to go?\nStep 1 Response: {"destination":"Rome"}\nStep 2 Question: When do you want to travel?'
    )
  })

  it('includes all steps with responses', () => {
    const result = buildConversationMemory([step1, step3])
    expect(result).toContain('Step 1 Question: Where do you want to go?')
    expect(result).toContain('Step 1 Response: {"destination":"Rome"}')
    expect(result).toContain('Step 3 Question: What is your budget?')
    expect(result).toContain('Step 3 Response: {"budget":500}')
  })
})

describe('extractStepResults', () => {
  it('returns empty array for null input', () => {
    expect(extractStepResults(null)).toEqual([])
  })

  it('returns empty array for empty steps', () => {
    expect(extractStepResults([])).toEqual([])
  })

  it('excludes steps without a response', () => {
    const results = extractStepResults([step2])
    expect(results).toEqual([])
  })

  it('extracts step results with response', () => {
    const results = extractStepResults([step1])
    expect(results).toEqual([
      { stepId: 'step_1', stepNumber: 1, response: { destination: 'Rome' } },
    ])
  })

  it('filters out null responses and keeps non-null ones', () => {
    const results = extractStepResults([step1, step2, step3])
    expect(results).toHaveLength(2)
    expect(results[0].stepId).toBe('step_1')
    expect(results[1].stepId).toBe('step_3')
  })
})

describe('getCurrentStep', () => {
  const steps = [step1, step2, step3]

  it('returns null for null steps', () => {
    expect(getCurrentStep(null, 0)).toBeNull()
  })

  it('returns null for negative index', () => {
    expect(getCurrentStep(steps, -1)).toBeNull()
  })

  it('returns null for index out of bounds', () => {
    expect(getCurrentStep(steps, 3)).toBeNull()
  })

  it('returns the correct step at index 0', () => {
    expect(getCurrentStep(steps, 0)).toEqual(step1)
  })

  it('returns the correct step at last index', () => {
    expect(getCurrentStep(steps, 2)).toEqual(step3)
  })

  it('returns the correct step at middle index', () => {
    expect(getCurrentStep(steps, 1)).toEqual(step2)
  })
})
