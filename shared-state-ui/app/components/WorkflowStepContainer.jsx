'use client';

import { useRef, useEffect, useState } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';
import DynamicStepRenderer from '@/app/components/DynamicStepRenderer';
import AdaptiveLayoutProvider from '@/app/components/AdaptiveLayoutProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { processWithGemini } from '@/app/actions/processUserInput';
import { mapResponsesToProfile } from '@/app/utils/workflowHelpers';
import { generateSemanticSummary, speakText, cancelSpeech } from '@/app/utils/semanticSpeech';

function FinalSummaryContainer({ summary, actionLabel, onComplete }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex flex-col gap-3">
      {summary && (
        <p className="text-sm text-green-900">{summary}</p>
      )}
      <Button
        onClick={onComplete}
        className="self-start bg-green-700 hover:bg-green-800 text-white"
      >
        {actionLabel || "Complete Task"}
      </Button>
    </div>
  );
}

export default function WorkflowStepContainer() {
  const workflow = useSharedStateStore((state) => state.workflow);
  const currentStepIndex = useSharedStateStore((state) => state.currentStepIndex);
  const estimatedRemainingSteps = useSharedStateStore((state) => state.estimatedRemainingSteps);
  const isLoading = useSharedStateStore((state) => state.isLoading);
  const error = useSharedStateStore((state) => state.error);
  const systemContext = useSharedStateStore((state) => state.systemContext);
  const goToPreviousStep = useSharedStateStore((state) => state.goToPreviousStep);
  const resetWorkflow = useSharedStateStore((state) => state.resetWorkflow);
  const setSystemContext = useSharedStateStore((state) => state.setSystemContext);
  const updateStepResponse = useSharedStateStore((state) => state.updateStepResponse);
  const addStep = useSharedStateStore((state) => state.addStep);
  const setLoading = useSharedStateStore((state) => state.setLoading);
  const setError = useSharedStateStore((state) => state.setError);
  const clearError = useSharedStateStore((state) => state.clearError);
  const setEstimatedSteps = useSharedStateStore((state) => state.setEstimatedSteps);
  const setUserProfile = useSharedStateStore((state) => state.setUserProfile);
  const updateUserProfile = useSharedStateStore((state) => state.updateUserProfile);
  const userProfile = useSharedStateStore((state) => state.userProfile);
  const telemetry = useSharedStateStore((state) => state.telemetry);

  const stepRendererRef = useRef(null);
  const titleRef = useRef(null);

  const currentStep = workflow.steps[currentStepIndex] ?? null;

  const [stepAnnouncement, setStepAnnouncement] = useState('');
  const [highLoadAlertShown, setHighLoadAlertShown] = useState(false);

  useEffect(() => {
    if (currentStep && !isLoading && !error) {
      titleRef.current?.focus();
      setStepAnnouncement(`Step ${currentStep.stepNumber}: ${workflow.taskName}`);
    }
  }, [currentStep, isLoading, error, workflow.taskName]);

  useEffect(() => {
    setHighLoadAlertShown(false);
  }, [currentStep?.stepId]);

  useEffect(() => {
    if (!highLoadAlertShown && telemetry.localCognitiveLoadScore > 7) {
      updateUserProfile({ cognitive: { requiresDecisionSupport: true, safeMode: true } });
      setHighLoadAlertShown(true);
    }
  }, [telemetry.localCognitiveLoadScore, highLoadAlertShown, updateUserProfile]);

  useEffect(() => {
    if (
      currentStep &&
      !isLoading &&
      !currentStep.isFinalStep &&
      userProfile.interaction.preferredModality === 'voice'
    ) {
      const summary = generateSemanticSummary(currentStep);
      speakText(summary);
    }
    return () => {
      cancelSpeech();
    };
  }, [currentStep, isLoading, userProfile.interaction.preferredModality]);

  useEffect(() => {
    const handleInteraction = () => cancelSpeech();
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    return () => {
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
    };
  }, []);

  const handleSubmit = async () => {
    if (!stepRendererRef.current) return;
    const isValid = stepRendererRef.current.validate();
    if (!isValid) return;

    const responses = stepRendererRef.current.getResponses();
    updateStepResponse(currentStep.stepId, responses);

    const updatedSteps = workflow.steps
      .slice(0, currentStepIndex + 1)
      .map((s) => s.stepId === currentStep.stepId ? { ...s, response: responses } : s);
    const updatedWorkflow = { ...workflow, steps: updatedSteps };

    const userInput = JSON.stringify(responses);

    clearError();
    setLoading(true);
    try {
      const nextStep = await processWithGemini(userInput, systemContext, updatedWorkflow, { userProfile, telemetry });
      addStep(nextStep);
      setEstimatedSteps(nextStep.estimatedRemainingSteps);
    } catch (err) {
      setError(err.message || 'Failed to process step.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    goToPreviousStep();
  };

  const handleReset = () => {
    resetWorkflow();
    setSystemContext("");
  };

  const handleComplete = () => {
    if (workflow.steps[0]?.taskType === 'accessibility_onboarding') {
      const profile = mapResponsesToProfile(workflow.steps);
      setUserProfile(profile);
    }
    resetWorkflow();
    setSystemContext("");
  };

  return (
    <div
      role="region"
      aria-labelledby={currentStep ? 'step-title' : undefined}
      aria-label={currentStep ? undefined : 'Workflow step section'}
      className="max-w-2xl mx-auto mt-6"
    >
      <div aria-live="assertive" className="sr-only">
        {isLoading ? 'Processing...' : ''}
      </div>
      <div aria-live="polite" className="sr-only">
        {stepAnnouncement}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10" aria-hidden="true">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-700" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {highLoadAlertShown && (
        <Alert aria-live="assertive" className="mb-4">
          <AlertTitle>Support Activated</AlertTitle>
          <AlertDescription>
            We noticed this step is taking longer. We have highlighted the current input and enabled safe mode to help you.
          </AlertDescription>
        </Alert>
      )}

      {currentStep && (
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-4">
          <h2
            id="step-title"
            tabIndex="-1"
            ref={titleRef}
            className="text-xl font-semibold tracking-tight outline-none"
          >
            {workflow.taskName}
          </h2>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Step {currentStep.stepNumber}</span>
            {estimatedRemainingSteps !== null && (
              <span>~{estimatedRemainingSteps} steps remaining</span>
            )}
          </div>

          <p className="text-muted-foreground text-sm">{currentStep.stateSummary}</p>

          {!currentStep.isFinalStep && (
            <AdaptiveLayoutProvider uiDensity={currentStep.uiDensity}>
              <DynamicStepRenderer
                ref={stepRendererRef}
                key={currentStep.stepId}
                inputs={currentStep.inputs || []}
                initialResponses={currentStep.response || {}}
                requiresDecisionSupport={userProfile.cognitive.requiresDecisionSupport}
                isScreenReader={userProfile.sensory.vision === 'screen_reader'}
                decisionExplanation={currentStep.decisionExplanation || ''}
              />
            </AdaptiveLayoutProvider>
          )}

          {currentStep.isFinalStep && (
            <FinalSummaryContainer
              summary={currentStep.finalSummary}
              actionLabel={currentStep.finalActionLabel}
              onComplete={handleComplete}
            />
          )}

          <div className="flex gap-2 mt-2 flex-wrap">
            {!currentStep.isFinalStep && (
              <Button onClick={handleSubmit} className="self-start">
                Submit Step
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
            >
              Previous Step
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              className="ml-auto"
            >
              Reset Workflow
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
