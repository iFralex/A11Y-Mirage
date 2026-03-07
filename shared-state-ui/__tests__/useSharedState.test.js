import { describe, it, expect, beforeEach } from 'vitest'
import { useSharedStateStore, defaultUserProfile, defaultTelemetry } from '../app/store/useSharedState'

const initialWorkflow = { taskId: null, taskName: "", steps: [] }
const initialUserProfile = {
  sensory: { vision: 'default', color: 'default' },
  cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
  interaction: { preferredModality: 'visual', progressiveDisclosure: false },
}
const initialTelemetry = {
  focusSwitchesCurrentStep: 0,
  timeOnCurrentStep: 0,
  errorCount: 0,
  localCognitiveLoadScore: 0,
}

describe('useSharedStateStore', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: "",
      taskData: null,
      isLoading: false,
      error: null,
      workflow: { ...initialWorkflow },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,
      userProfile: { ...initialUserProfile, sensory: { ...initialUserProfile.sensory }, cognitive: { ...initialUserProfile.cognitive }, interaction: { ...initialUserProfile.interaction } },
      telemetry: { ...initialTelemetry },
    })
  })

  it('has correct initial state', () => {
    const state = useSharedStateStore.getState()
    expect(state.systemContext).toBe("")
    expect(state.taskData).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.workflow).toEqual(initialWorkflow)
    expect(state.currentStepIndex).toBe(0)
    expect(state.estimatedRemainingSteps).toBeNull()
    expect(state.userProfile).toEqual(initialUserProfile)
    expect(state.telemetry).toEqual(initialTelemetry)
  })

  it('setSystemContext updates systemContext', () => {
    useSharedStateStore.getState().setSystemContext("test context")
    expect(useSharedStateStore.getState().systemContext).toBe("test context")
  })

  it('updateTaskData updates taskData', () => {
    const data = { taskId: '1', taskType: 'meeting_coordination' }
    useSharedStateStore.getState().updateTaskData(data)
    expect(useSharedStateStore.getState().taskData).toEqual(data)
  })

  it('setLoading updates isLoading', () => {
    useSharedStateStore.getState().setLoading(true)
    expect(useSharedStateStore.getState().isLoading).toBe(true)
    useSharedStateStore.getState().setLoading(false)
    expect(useSharedStateStore.getState().isLoading).toBe(false)
  })

  it('setError updates error', () => {
    useSharedStateStore.getState().setError("Something went wrong")
    expect(useSharedStateStore.getState().error).toBe("Something went wrong")
  })

  it('clearError resets error to null', () => {
    useSharedStateStore.getState().setError("Some error")
    useSharedStateStore.getState().clearError()
    expect(useSharedStateStore.getState().error).toBeNull()
  })

  describe('workflow state', () => {
    const step1 = {
      taskId: 'task_1',
      taskName: 'Book a trip',
      stepId: 'step_1',
      stepNumber: 1,
      questionSummary: 'Where do you want to go?',
      inputs: [{ id: 'destination', type: 'text_input', label: 'Destination' }],
      response: null,
    }

    const step2 = {
      taskId: 'task_1',
      taskName: 'Book a trip',
      stepId: 'step_2',
      stepNumber: 2,
      questionSummary: 'When do you want to travel?',
      inputs: [{ id: 'date', type: 'date_input', label: 'Travel Date' }],
      response: null,
    }

    it('addStep appends a step and updates currentStepIndex', () => {
      useSharedStateStore.getState().addStep(step1)
      const state = useSharedStateStore.getState()
      expect(state.workflow.steps).toHaveLength(1)
      expect(state.workflow.steps[0]).toEqual(step1)
      expect(state.currentStepIndex).toBe(0)
      expect(state.workflow.taskId).toBe('task_1')
      expect(state.workflow.taskName).toBe('Book a trip')
    })

    it('addStep increments currentStepIndex for subsequent steps', () => {
      useSharedStateStore.getState().addStep(step1)
      useSharedStateStore.getState().addStep(step2)
      const state = useSharedStateStore.getState()
      expect(state.workflow.steps).toHaveLength(2)
      expect(state.currentStepIndex).toBe(1)
    })

    it('updateStepResponse updates the response of the matching step', () => {
      useSharedStateStore.getState().addStep(step1)
      useSharedStateStore.getState().updateStepResponse('step_1', { destination: 'Rome' })
      const state = useSharedStateStore.getState()
      expect(state.workflow.steps[0].response).toEqual({ destination: 'Rome' })
    })

    it('updateStepResponse does not affect other steps', () => {
      useSharedStateStore.getState().addStep(step1)
      useSharedStateStore.getState().addStep(step2)
      useSharedStateStore.getState().updateStepResponse('step_1', { destination: 'Rome' })
      const state = useSharedStateStore.getState()
      expect(state.workflow.steps[1].response).toBeNull()
    })

    it('goToPreviousStep decrements currentStepIndex', () => {
      useSharedStateStore.getState().addStep(step1)
      useSharedStateStore.getState().addStep(step2)
      useSharedStateStore.getState().goToPreviousStep()
      expect(useSharedStateStore.getState().currentStepIndex).toBe(0)
    })

    it('goToPreviousStep does not go below 0', () => {
      useSharedStateStore.getState().goToPreviousStep()
      expect(useSharedStateStore.getState().currentStepIndex).toBe(0)
    })

    it('setEstimatedSteps updates estimatedRemainingSteps', () => {
      useSharedStateStore.getState().setEstimatedSteps(5)
      expect(useSharedStateStore.getState().estimatedRemainingSteps).toBe(5)
    })

    it('resetWorkflow clears all workflow state', () => {
      useSharedStateStore.getState().addStep(step1)
      useSharedStateStore.getState().setEstimatedSteps(3)
      useSharedStateStore.getState().resetWorkflow()
      const state = useSharedStateStore.getState()
      expect(state.workflow).toEqual(initialWorkflow)
      expect(state.currentStepIndex).toBe(0)
      expect(state.estimatedRemainingSteps).toBeNull()
    })
  })

  describe('userProfile state', () => {
    it('has correct default userProfile shape', () => {
      expect(defaultUserProfile).toEqual(initialUserProfile)
    })

    it('setUserProfile replaces the entire userProfile', () => {
      const newProfile = {
        sensory: { vision: 'screen_reader', color: 'high_contrast' },
        cognitive: { maxInputsPerStep: 3, requiresDecisionSupport: true, safeMode: true },
        interaction: { preferredModality: 'voice', progressiveDisclosure: true },
      }
      useSharedStateStore.getState().setUserProfile(newProfile)
      expect(useSharedStateStore.getState().userProfile).toEqual(newProfile)
    })

    it('updateUserProfile deep-merges sensory sub-object', () => {
      useSharedStateStore.getState().updateUserProfile({ sensory: { vision: 'low_vision' } })
      const { userProfile } = useSharedStateStore.getState()
      expect(userProfile.sensory.vision).toBe('low_vision')
      expect(userProfile.sensory.color).toBe('default')
    })

    it('updateUserProfile deep-merges cognitive sub-object', () => {
      useSharedStateStore.getState().updateUserProfile({ cognitive: { safeMode: true } })
      const { userProfile } = useSharedStateStore.getState()
      expect(userProfile.cognitive.safeMode).toBe(true)
      expect(userProfile.cognitive.requiresDecisionSupport).toBe(false)
      expect(userProfile.cognitive.maxInputsPerStep).toBeNull()
    })

    it('updateUserProfile deep-merges interaction sub-object', () => {
      useSharedStateStore.getState().updateUserProfile({ interaction: { preferredModality: 'voice' } })
      const { userProfile } = useSharedStateStore.getState()
      expect(userProfile.interaction.preferredModality).toBe('voice')
      expect(userProfile.interaction.progressiveDisclosure).toBe(false)
    })

    it('updateUserProfile does not affect unrelated sub-objects', () => {
      useSharedStateStore.getState().updateUserProfile({ sensory: { color: 'high_contrast' } })
      const { userProfile } = useSharedStateStore.getState()
      expect(userProfile.cognitive).toEqual(initialUserProfile.cognitive)
      expect(userProfile.interaction).toEqual(initialUserProfile.interaction)
    })
  })

  describe('telemetry state', () => {
    it('has correct default telemetry shape', () => {
      expect(defaultTelemetry).toEqual(initialTelemetry)
    })

    it('updateTelemetry merges new metrics into telemetry', () => {
      useSharedStateStore.getState().updateTelemetry({ focusSwitchesCurrentStep: 3, errorCount: 1 })
      const { telemetry } = useSharedStateStore.getState()
      expect(telemetry.focusSwitchesCurrentStep).toBe(3)
      expect(telemetry.errorCount).toBe(1)
      expect(telemetry.timeOnCurrentStep).toBe(0)
      expect(telemetry.localCognitiveLoadScore).toBe(0)
    })

    it('updateTelemetry updates localCognitiveLoadScore', () => {
      useSharedStateStore.getState().updateTelemetry({ localCognitiveLoadScore: 7.5 })
      expect(useSharedStateStore.getState().telemetry.localCognitiveLoadScore).toBe(7.5)
    })

    it('resetTelemetryForNewStep resets all telemetry to defaults', () => {
      useSharedStateStore.getState().updateTelemetry({ focusSwitchesCurrentStep: 5, timeOnCurrentStep: 30, errorCount: 2, localCognitiveLoadScore: 8 })
      useSharedStateStore.getState().resetTelemetryForNewStep()
      expect(useSharedStateStore.getState().telemetry).toEqual(initialTelemetry)
    })
  })
})
