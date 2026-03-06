import { describe, it, expect, beforeEach } from 'vitest'
import { useSharedStateStore } from '../app/store/useSharedState'

const initialWorkflow = { taskId: null, taskName: "", steps: [] }

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
})
