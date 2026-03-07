import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const defaultUserProfile = {
  sensory: {
    vision: 'default',
    color: 'default',
  },
  cognitive: {
    maxInputsPerStep: null,
    requiresDecisionSupport: false,
    safeMode: false,
  },
  interaction: {
    preferredModality: 'visual',
    progressiveDisclosure: false,
  },
}

export const defaultTelemetry = {
  focusSwitchesCurrentStep: 0,
  timeOnCurrentStep: 0,
  errorCount: 0,
  localCognitiveLoadScore: 0,
}

export const useSharedStateStore = create(
  persist(
    (set, get) => ({
      systemContext: "",
      taskData: null,
      isLoading: false,
      error: null,

      userProfile: { ...defaultUserProfile, sensory: { ...defaultUserProfile.sensory }, cognitive: { ...defaultUserProfile.cognitive }, interaction: { ...defaultUserProfile.interaction } },
      telemetry: { ...defaultTelemetry },

      workflow: {
        taskId: null,
        taskName: "",
        steps: [],
      },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,

      setUserProfile: (profile) => set({ userProfile: profile }),
      updateUserProfile: (updates) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          ...updates,
          sensory: updates.sensory ? { ...state.userProfile.sensory, ...updates.sensory } : state.userProfile.sensory,
          cognitive: updates.cognitive ? { ...state.userProfile.cognitive, ...updates.cognitive } : state.userProfile.cognitive,
          interaction: updates.interaction ? { ...state.userProfile.interaction, ...updates.interaction } : state.userProfile.interaction,
        },
      })),
      updateTelemetry: (metrics) => set((state) => ({
        telemetry: { ...state.telemetry, ...metrics },
      })),
      resetTelemetryForNewStep: () => set({ telemetry: { ...defaultTelemetry } }),

      setSystemContext: (text) => set({ systemContext: text }),
      updateTaskData: (data) => set({ taskData: data }),
      setLoading: (boolean) => set({ isLoading: boolean }),
      setError: (string) => set({ error: string }),
      clearError: () => set({ error: null }),

      addStep: (step) => set((state) => {
        const truncated = state.workflow.steps.slice(0, state.currentStepIndex + 1);
        return {
          workflow: {
            ...state.workflow,
            taskId: step.taskId ?? state.workflow.taskId,
            taskName: step.taskName ?? state.workflow.taskName,
            steps: [...truncated, step],
          },
          currentStepIndex: truncated.length,
        };
      }),

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
        userProfile: state.userProfile,
      }),
    }
  )
)
