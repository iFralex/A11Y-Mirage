'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';

/**
 * Tracks how long the user spends on a step, how many times they switch focus
 * inside the step container, and computes a cognitive load score every 2 seconds.
 *
 * Score formula: (timeInSeconds * 0.1) + (focusSwitches * 0.5) + (errorCount * 2)
 * Score is capped at 10.
 *
 * @param {React.RefObject} containerRef - ref attached to the step's root element
 * @returns {{ resetTelemetry: () => void }}
 */
export function useStepTelemetry(containerRef) {
  const updateTelemetry = useSharedStateStore((state) => state.updateTelemetry);
  const resetTelemetryForNewStep = useSharedStateStore((state) => state.resetTelemetryForNewStep);

  // Use refs so event handlers and interval always read the latest values
  // without needing to re-register them on every render.
  const startTimeRef = useRef(Date.now());
  const focusSwitchesRef = useRef(0);

  useEffect(() => {
    // Reset counters for this mount (new step).
    startTimeRef.current = Date.now();
    focusSwitchesRef.current = 0;

    const container = containerRef?.current;

    // --- focusin listener -------------------------------------------------
    const handleFocusIn = () => {
      focusSwitchesRef.current += 1;
    };

    if (container) {
      container.addEventListener('focusin', handleFocusIn);
    }

    // --- scoring interval (every 2 seconds) -------------------------------
    const intervalId = setInterval(() => {
      const timeInSeconds = (Date.now() - startTimeRef.current) / 1000;
      const focusSwitches = focusSwitchesRef.current;
      // Read errorCount directly from the store without subscribing to it
      // (avoids triggering re-renders from within the interval).
      const errorCount = useSharedStateStore.getState().telemetry.errorCount;

      const rawScore = (timeInSeconds * 0.1) + (focusSwitches * 0.5) + (errorCount * 2);
      const localCognitiveLoadScore = Math.min(10, rawScore);

      updateTelemetry({
        timeOnCurrentStep: Math.round(timeInSeconds),
        focusSwitchesCurrentStep: focusSwitches,
        localCognitiveLoadScore,
      });
    }, 2000);

    return () => {
      if (container) {
        container.removeEventListener('focusin', handleFocusIn);
      }
      clearInterval(intervalId);
    };
    // containerRef is stable; updateTelemetry is stable (Zustand action).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Call this when the user submits a step to reset all telemetry counters.
   */
  const resetTelemetry = useCallback(() => {
    focusSwitchesRef.current = 0;
    startTimeRef.current = Date.now();
    resetTelemetryForNewStep();
  }, [resetTelemetryForNewStep]);

  return { resetTelemetry };
}
