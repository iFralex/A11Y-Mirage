import { describe, it, expect, beforeEach } from 'vitest'
import { useSharedStateStore } from '../app/store/useSharedState'

describe('useSharedStateStore', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: "",
      taskData: null,
      isLoading: false,
      error: null,
    })
  })

  it('has correct initial state', () => {
    const state = useSharedStateStore.getState()
    expect(state.systemContext).toBe("")
    expect(state.taskData).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
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
})
