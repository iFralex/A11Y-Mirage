import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSharedStateStore = create(
  persist(
    (set) => ({
      systemContext: "",
      taskData: null,
      isLoading: false,
      error: null,

      setSystemContext: (text) => set({ systemContext: text }),
      updateTaskData: (data) => set({ taskData: data }),
      setLoading: (boolean) => set({ isLoading: boolean }),
      setError: (string) => set({ error: string }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'shared-state-storage',
      partialize: (state) => ({
        systemContext: state.systemContext,
        taskData: state.taskData,
      }),
    }
  )
)
