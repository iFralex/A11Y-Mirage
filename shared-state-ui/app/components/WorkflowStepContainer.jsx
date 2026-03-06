'use client';

import { useRef, useEffect } from 'react';
import { useSharedStateStore } from '@/app/store/useSharedState';
import DynamicStepRenderer from '@/app/components/DynamicStepRenderer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { processWithGemini } from '@/app/actions/processUserInput';

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

  const stepRendererRef = useRef(null);
  const titleRef = useRef(null);

  const currentStep = workflow.steps[currentStepIndex] ?? null;

  useEffect(() => {
    if (currentStep && !isLoading && !error) {
      titleRef.current?.focus();
    }
  }, [currentStep, isLoading, error]);

  const handleSubmit = async () => {
    if (!stepRendererRef.current) return;
    const isValid = stepRendererRef.current.validate();
    if (!isValid) return;

    const responses = stepRendererRef.current.getResponses();
    updateStepResponse(currentStep.stepId, responses);

    const updatedSteps = workflow.steps.map((s) =>
      s.stepId === currentStep.stepId ? { ...s, response: responses } : s
    );
    const updatedWorkflow = { ...workflow, steps: updatedSteps };

    const userInput = JSON.stringify(responses);

    clearError();
    setLoading(true);
    try {
      const nextStep = await processWithGemini(userInput, systemContext, updatedWorkflow);
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

          <DynamicStepRenderer
            ref={stepRendererRef}
            key={currentStep.stepId}
            inputs={currentStep.inputs || []}
            initialResponses={currentStep.response || {}}
          />

          <div className="flex gap-2 mt-2 flex-wrap">
            <Button onClick={handleSubmit} className="self-start">
              Submit Step
            </Button>
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
