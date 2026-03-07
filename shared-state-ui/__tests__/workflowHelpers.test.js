import { describe, it, expect } from 'vitest'
import {
  buildConversationMemory,
  extractStepResults,
  getCurrentStep,
  mapResponsesToProfile,
} from '../app/utils/workflowHelpers'

const step1 = {
  stepId: 'step_1',
  stepNumber: 1,
  stateSummary: 'Where do you want to go?',
  inputs: [{ id: 'destination', type: 'text_input', label: 'Destination' }],
  response: { destination: 'Rome' },
}

const step2 = {
  stepId: 'step_2',
  stepNumber: 2,
  stateSummary: 'When do you want to travel?',
  inputs: [{ id: 'date', type: 'date_input', label: 'Travel Date' }],
  response: null,
}

const step3 = {
  stepId: 'step_3',
  stepNumber: 3,
  stateSummary: 'What is your budget?',
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

describe('mapResponsesToProfile', () => {
  const defaultProfile = {
    sensory: { vision: 'default', color: 'default' },
    cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
    interaction: { preferredModality: 'visual', progressiveDisclosure: false },
  }

  it('returns default profile for empty steps', () => {
    expect(mapResponsesToProfile([])).toEqual(defaultProfile)
  })

  it('returns default profile for null input', () => {
    expect(mapResponsesToProfile(null)).toEqual(defaultProfile)
  })

  it('returns default profile when steps have no responses', () => {
    const steps = [{ response: null }, { response: undefined }]
    expect(mapResponsesToProfile(steps)).toEqual(defaultProfile)
  })

  it('maps sensory_vision correctly', () => {
    const steps = [{ response: { sensory_vision: 'screen_reader' } }]
    expect(mapResponsesToProfile(steps).sensory.vision).toBe('screen_reader')
  })

  it('maps sensory_color correctly', () => {
    const steps = [{ response: { sensory_color: 'high_contrast' } }]
    expect(mapResponsesToProfile(steps).sensory.color).toBe('high_contrast')
  })

  it('maps cognitive_requiresDecisionSupport correctly', () => {
    const steps = [{ response: { cognitive_requiresDecisionSupport: true } }]
    expect(mapResponsesToProfile(steps).cognitive.requiresDecisionSupport).toBe(true)
  })

  it('maps cognitive_safeMode correctly', () => {
    const steps = [{ response: { cognitive_safeMode: true } }]
    expect(mapResponsesToProfile(steps).cognitive.safeMode).toBe(true)
  })

  it('maps cognitive_maxInputsPerStep as a number', () => {
    const steps = [{ response: { cognitive_maxInputsPerStep: 3 } }]
    expect(mapResponsesToProfile(steps).cognitive.maxInputsPerStep).toBe(3)
  })

  it('ignores cognitive_maxInputsPerStep if not a number', () => {
    const steps = [{ response: { cognitive_maxInputsPerStep: 'three' } }]
    expect(mapResponsesToProfile(steps).cognitive.maxInputsPerStep).toBeNull()
  })

  it('maps interaction_preferredModality correctly', () => {
    const steps = [{ response: { interaction_preferredModality: 'voice' } }]
    expect(mapResponsesToProfile(steps).interaction.preferredModality).toBe('voice')
  })

  it('maps interaction_progressiveDisclosure correctly', () => {
    const steps = [{ response: { interaction_progressiveDisclosure: true } }]
    expect(mapResponsesToProfile(steps).interaction.progressiveDisclosure).toBe(true)
  })

  it('falls back to default for invalid sensory_vision value', () => {
    const steps = [{ response: { sensory_vision: 'invalid_value' } }]
    expect(mapResponsesToProfile(steps).sensory.vision).toBe('default')
  })

  it('falls back to default for invalid interaction_preferredModality value', () => {
    const steps = [{ response: { interaction_preferredModality: 'telepathy' } }]
    expect(mapResponsesToProfile(steps).interaction.preferredModality).toBe('visual')
  })

  it('merges responses from multiple steps', () => {
    const steps = [
      { response: { sensory_vision: 'low_vision', sensory_color: 'high_contrast' } },
      { response: { cognitive_safeMode: true, interaction_preferredModality: 'hybrid' } },
    ]
    const profile = mapResponsesToProfile(steps)
    expect(profile.sensory.vision).toBe('low_vision')
    expect(profile.sensory.color).toBe('high_contrast')
    expect(profile.cognitive.safeMode).toBe(true)
    expect(profile.interaction.preferredModality).toBe('hybrid')
  })

  it('maps a full set of onboarding responses correctly', () => {
    const steps = [
      {
        response: {
          sensory_vision: 'screen_reader',
          sensory_color: 'high_contrast',
        },
      },
      {
        response: {
          cognitive_maxInputsPerStep: 2,
          cognitive_requiresDecisionSupport: true,
          cognitive_safeMode: true,
        },
      },
      {
        response: {
          interaction_preferredModality: 'voice',
          interaction_progressiveDisclosure: true,
        },
      },
    ]
    expect(mapResponsesToProfile(steps)).toEqual({
      sensory: { vision: 'screen_reader', color: 'high_contrast' },
      cognitive: { maxInputsPerStep: 2, requiresDecisionSupport: true, safeMode: true },
      interaction: { preferredModality: 'voice', progressiveDisclosure: true },
    })
  })
})
