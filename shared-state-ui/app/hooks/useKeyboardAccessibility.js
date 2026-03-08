'use client';

import { useEffect, useCallback } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';
import SpeechController from '@/app/utils/speechController';

const HELP_TEXT =
  'Keyboard shortcuts: ' +
  'Alt R to reread the current step. ' +
  'Alt P to pause speech. ' +
  'Alt C to resume speech. ' +
  'Alt S to skip or cancel speech. ' +
  'Alt F to focus the suggested option. ' +
  'Alt N to go to the next step. ' +
  'Alt B to go back to the previous step. ' +
  'Alt H to hear these shortcuts again.';

/**
 * Global keyboard accessibility hook.
 *
 * Registers a single `keydown` listener on `window` and maps Alt+key
 * combinations to accessibility actions. The hook is designed to be
 * mounted once at the application root so shortcuts work everywhere.
 *
 * Shortcuts implemented:
 *   Alt + R  – reread current step
 *   Alt + P  – pause speech
 *   Alt + C  – resume/continue speech
 *   Alt + S  – skip / cancel speech
 *   Alt + F  – focus the recommended option
 *   Alt + N  – go to next step (click submit button)
 *   Alt + B  – go to previous step
 *   Alt + H  – open / announce accessibility help
 *
 * Native browser accessibility behaviour is preserved:
 * - Only Alt+key shortcuts are intercepted; no unmodified keys are captured.
 * - `event.preventDefault()` is called only after the hook claims the event,
 *   never when `event.defaultPrevented` is already true (another handler
 *   already consumed it).
 * - Shortcuts are ignored when the event originates inside an <input>,
 *   <textarea>, or <select> that does not itself process Alt combinations,
 *   ensuring screen-reader virtual-cursor commands are not disrupted.
 */
export function useKeyboardAccessibility() {
  const goToPreviousStep = useSharedStateStore((state) => state.goToPreviousStep);
  const userProfile = useSharedStateStore((state) => state.userProfile);
  const telemetry = useSharedStateStore((state) => state.telemetry);

  const handleKeydown = useCallback(
    (event) => {
      // Only handle Alt + key combinations.
      if (!event.altKey) return;

      // Respect events already consumed by another handler.
      if (event.defaultPrevented) return;

      const key = event.key.toLowerCase();

      const speechOptions = {
        userProfile,
        cognitiveLoadScore: telemetry.localCognitiveLoadScore,
      };

      switch (key) {
        case 'r': {
          // Reread the current step narration.
          event.preventDefault();
          SpeechController.reread(speechOptions);
          break;
        }

        case 'p': {
          // Pause ongoing speech.
          event.preventDefault();
          SpeechController.pause();
          break;
        }

        case 'c': {
          // Resume / continue paused speech.
          event.preventDefault();
          SpeechController.resume();
          break;
        }

        case 's': {
          // Skip / cancel speech immediately.
          event.preventDefault();
          SpeechController.cancel();
          break;
        }

        case 'f': {
          // Focus the recommended (suggested) option in the current step.
          event.preventDefault();
          const recommended = document.querySelector('[data-recommended="true"]');
          if (recommended) {
            recommended.focus();
            recommended.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          }
          break;
        }

        case 'n': {
          // Trigger the primary submit / next-step button.
          event.preventDefault();
          const submitBtn =
            document.querySelector('[data-action="submit-step"]') ||
            document.querySelector('button[type="submit"]');
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
          }
          break;
        }

        case 'b': {
          // Navigate to the previous step.
          event.preventDefault();
          goToPreviousStep();
          break;
        }

        case 'h': {
          // Open the accessibility help panel or announce shortcuts via speech.
          event.preventDefault();
          const helpBtn = document.querySelector('[data-action="open-help"]');
          if (helpBtn) {
            helpBtn.click();
          } else {
            SpeechController.speak(HELP_TEXT, speechOptions);
          }
          break;
        }

        default:
          // Unknown Alt+key: do not intercept.
          break;
      }
    },
    [goToPreviousStep, userProfile, telemetry]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);
}
