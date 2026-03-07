import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContextSetup from '../app/components/ContextSetup'
import { useSharedStateStore } from '../app/store/useSharedState'

vi.mock('../app/actions/processUserInput', () => ({
  processWithGemini: vi.fn(),
}))

import { processWithGemini } from '../app/actions/processUserInput'

describe('ContextSetup', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: '',
      taskData: null,
      isLoading: false,
      error: null,
      workflow: { taskId: null, taskName: '', steps: [] },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,
      userProfile: {
        sensory: { vision: 'default', color: 'default' },
        cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
        interaction: { preferredModality: 'visual', progressiveDisclosure: false },
      },
      telemetry: { focusSwitchesCurrentStep: 0, timeOnCurrentStep: 0, errorCount: 0, localCognitiveLoadScore: 0 },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the context setup card', () => {
    render(<ContextSetup />)
    expect(screen.getByText('Inizializzazione del Contesto')).toBeInTheDocument()
  })

  it('renders file input and textarea', () => {
    render(<ContextSetup />)
    expect(screen.getByLabelText('Carica file .txt')).toBeInTheDocument()
    expect(screen.getByLabelText('Oppure incolla il testo del contesto')).toBeInTheDocument()
  })

  it('renders a disabled save button when textarea is empty', () => {
    render(<ContextSetup />)
    const button = screen.getByRole('button', { name: 'Salva Contesto' })
    expect(button).toBeDisabled()
  })

  it('enables save button when text is entered', () => {
    render(<ContextSetup />)
    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    fireEvent.change(textarea, { target: { value: 'some context text' } })
    const button = screen.getByRole('button', { name: 'Salva Contesto' })
    expect(button).not.toBeDisabled()
  })

  it('calls setSystemContext with localContext when save button is clicked', () => {
    render(<ContextSetup />)
    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    fireEvent.change(textarea, { target: { value: 'my context' } })
    const button = screen.getByRole('button', { name: 'Salva Contesto' })
    fireEvent.click(button)
    expect(useSharedStateStore.getState().systemContext).toBe('my context')
  })

  it('updates textarea when user types', () => {
    render(<ContextSetup />)
    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    fireEvent.change(textarea, { target: { value: 'updated context' } })
    expect(textarea.value).toBe('updated context')
  })

  it('reads file content and populates textarea on file upload', () => {
    render(<ContextSetup />)
    const fileInput = screen.getByLabelText('Carica file .txt')

    const fileContent = 'File content from txt'
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' })

    class MockFileReader {
      readAsText() {
        this.onload({ target: { result: fileContent } })
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    expect(textarea.value).toBe(fileContent)
  })

  describe('Create Accessibility Profile button', () => {
    beforeEach(() => {
      processWithGemini.mockReset()
    })

    it('renders the Create Accessibility Profile button', () => {
      render(<ContextSetup />)
      expect(screen.getByRole('button', { name: 'Create Accessibility Profile' })).toBeInTheDocument()
    })

    it('clicking the button sets systemContext and starts the workflow', async () => {
      const firstStep = {
        taskId: 'a11y-task-1',
        taskType: 'accessibility_onboarding',
        taskName: 'Accessibility Onboarding',
        stepId: 'step_1',
        stepNumber: 1,
        estimatedRemainingSteps: 5,
        stateSummary: 'Collecting accessibility preferences.',
        inputs: [{ id: 'sensory_vision', type: 'select_option', label: 'Vision level', required: true }],
        isFinalStep: false,
      }
      processWithGemini.mockResolvedValueOnce(firstStep)

      render(<ContextSetup />)
      fireEvent.click(screen.getByRole('button', { name: 'Create Accessibility Profile' }))

      await waitFor(() => {
        const state = useSharedStateStore.getState()
        expect(state.systemContext).toContain('accessibility_onboarding')
        expect(state.workflow.steps).toHaveLength(1)
        expect(state.workflow.steps[0].taskType).toBe('accessibility_onboarding')
        expect(state.isLoading).toBe(false)
      })
    })

    it('sets error state when processWithGemini fails', async () => {
      processWithGemini.mockRejectedValueOnce(new Error('Network error'))

      render(<ContextSetup />)
      fireEvent.click(screen.getByRole('button', { name: 'Create Accessibility Profile' }))

      await waitFor(() => {
        expect(useSharedStateStore.getState().error).toBe('Network error')
        expect(useSharedStateStore.getState().isLoading).toBe(false)
      })
    })
  })
})
