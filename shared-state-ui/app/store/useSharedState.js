import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSharedStateStore = create(
  persist(
    (set, get) => ({
      systemContext: "",
      taskData: null,
      isLoading: false,
      error: null,

      workflow: {
        taskId: null,
        taskName: "",
        steps: [],
      },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,

      setSystemContext: (text) => set({ systemContext: text }),
      updateTaskData: (data) => set({ taskData: data }),
      setLoading: (boolean) => set({ isLoading: boolean }),
      setError: (string) => set({ error: string }),
      clearError: () => set({ error: null }),

      addStep: (step) => set((state) => ({
        workflow: {
          ...state.workflow,
          taskId: step.taskId ?? state.workflow.taskId,
          taskName: step.taskName ?? state.workflow.taskName,
          steps: [...state.workflow.steps, step],
        },
        currentStepIndex: state.workflow.steps.length,
      })),

      updateStepResponse: (stepId, response) => set((state) => ({
        workflow: {
          ...state.workflow,
          steps: state.workflow.steps.map((s) =>
            s.stepId === stepId ? { ...s, response } : s
          ),
        },
      })),

      goToPreviousStep: () => set((state) => ({
        currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      })),

      resetWorkflow: () => set({
        workflow: { taskId: null, taskName: "", steps: [] },
        currentStepIndex: 0,
        estimatedRemainingSteps: null,
      }),

      setEstimatedSteps: (n) => set({ estimatedRemainingSteps: n }),
    }),
    {
      name: 'shared-state-storage',
      partialize: (state) => ({
        systemContext: state.systemContext,
        taskData: state.taskData,
        workflow: state.workflow,
        currentStepIndex: state.currentStepIndex,
        estimatedRemainingSteps: state.estimatedRemainingSteps,
      }),
    }
  )
)
