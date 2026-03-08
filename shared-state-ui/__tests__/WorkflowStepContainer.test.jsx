import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import WorkflowStepContainer from '../app/components/WorkflowStepContainer';
import { useSharedStateStore } from '../app/store/useSharedState';

vi.mock('../app/actions/processUserInput', () => ({
  processWithGemini: vi.fn(),
}));

import { processWithGemini } from '../app/actions/processUserInput';

const STEP_1 = {
  stepId: 'step-1',
  stepNumber: 1,
  taskId: 'task-abc',
  taskName: 'Plan a Trip',
  stateSummary: 'Gathering initial trip details.',
  inputs: [{ id: 'destination', type: 'text_input', label: 'Destination', required: true }],
  response: null,
};

const STEP_2 = {
  stepId: 'step-2',
  stepNumber: 2,
  taskId: 'task-abc',
  taskName: 'Plan a Trip',
  stateSummary: 'Choosing travel dates.',
  inputs: [{ id: 'travelDate', type: 'date_input', label: 'Travel date' }],
  response: null,
};

const DEFAULT_USER_PROFILE = {
  sensory: { vision: 'default', color: 'default' },
  cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
  interaction: { preferredModality: 'visual', progressiveDisclosure: false },
};

const DEFAULT_TELEMETRY = {
  focusSwitchesCurrentStep: 0,
  timeOnCurrentStep: 0,
  errorCount: 0,
  localCognitiveLoadScore: 0,
};

function baseState(overrides = {}) {
  return {
    systemContext: '',
    taskData: null,
    isLoading: false,
    error: null,
    workflow: { taskId: null, taskName: '', steps: [] },
    currentStepIndex: 0,
    estimatedRemainingSteps: null,
    userProfile: DEFAULT_USER_PROFILE,
    telemetry: DEFAULT_TELEMETRY,
    ...overrides,
  };
}

describe('WorkflowStepContainer', () => {
  beforeEach(() => {
    useSharedStateStore.setState(baseState());
  });

  it('renders nothing visible when there are no steps', () => {
    render(<WorkflowStepContainer />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders sr-only loading text when isLoading is true', () => {
    useSharedStateStore.setState(baseState({ isLoading: true }));
    render(<WorkflowStepContainer />);
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion.textContent).toBe('Processing...');
  });

  it('renders a visual spinner when isLoading is true', () => {
    useSharedStateStore.setState(baseState({ isLoading: true }));
    const { container } = render(<WorkflowStepContainer />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('aria-live region is empty when not loading', () => {
    render(<WorkflowStepContainer />);
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion.textContent).toBe('');
  });

  it('renders error Alert when error is set', () => {
    useSharedStateStore.setState(baseState({ error: 'Something went wrong.' }));
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('renders with role="region" and aria-label when no step is present', () => {
    render(<WorkflowStepContainer />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Workflow step section');
    expect(region).not.toHaveAttribute('aria-labelledby');
  });

  it('renders with role="region" and aria-labelledby="step-title" when a step is present', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-labelledby', 'step-title');
    expect(region).not.toHaveAttribute('aria-label');
  });

  it('renders task name as heading', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Plan a Trip');
  });

  it('renders step number', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('renders state summary', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByText('Gathering initial trip details.')).toBeInTheDocument();
  });

  it('renders estimated remaining steps when set', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        estimatedRemainingSteps: 3,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByText('~3 steps remaining')).toBeInTheDocument();
  });

  it('does not render estimated steps indicator when estimatedRemainingSteps is null', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        estimatedRemainingSteps: null,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.queryByText(/steps remaining/)).not.toBeInTheDocument();
  });

  it('renders Submit Step button', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('button', { name: 'Submit Step' })).toBeInTheDocument();
  });

  describe('Safe Mode', () => {
    function safeModeState(overrides = {}) {
      return baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        userProfile: {
          sensory: { vision: 'default', color: 'default' },
          cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: true },
          interaction: { preferredModality: 'visual', progressiveDisclosure: false },
        },
        ...overrides,
      });
    }

    it('renders "Review Choices" button instead of "Submit Step" when safeMode is true', () => {
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);
      expect(screen.getByRole('button', { name: 'Review Choices' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Submit Step' })).not.toBeInTheDocument();
    });

    it('clicking "Review Choices" opens a dialog when form is valid', async () => {
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);

      fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Rome' } });
      fireEvent.click(screen.getByRole('button', { name: 'Review Choices' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Review Your Choices')).toBeInTheDocument();
      });
    });

    it('dialog shows the selected values', async () => {
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);

      fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Tokyo' } });
      fireEvent.click(screen.getByRole('button', { name: 'Review Choices' }));

      await waitFor(() => {
        expect(screen.getByText('Tokyo')).toBeInTheDocument();
      });
    });

    it('dialog has "Confirm & Proceed" and "Undo" buttons', async () => {
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);

      fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Paris' } });
      fireEvent.click(screen.getByRole('button', { name: 'Review Choices' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Confirm & Proceed' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      });
    });

    it('clicking "Undo" closes the dialog without submitting', async () => {
      processWithGemini.mockClear();
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);

      fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Paris' } });
      fireEvent.click(screen.getByRole('button', { name: 'Review Choices' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(processWithGemini).not.toHaveBeenCalled();
    });

    it('clicking "Confirm & Proceed" submits and calls Gemini', async () => {
      const nextStep = {
        taskId: 'task-abc', taskName: 'Plan a Trip', taskType: 'generic',
        stepId: 'step-2', stepNumber: 2, estimatedRemainingSteps: 0,
        stateSummary: '', inputs: [{ id: 'x', type: 'text_input', label: 'X' }],
      };
      processWithGemini.mockResolvedValueOnce(nextStep);
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);

      fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Berlin' } });
      fireEvent.click(screen.getByRole('button', { name: 'Review Choices' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Confirm & Proceed' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirm & Proceed' }));

      await waitFor(() => {
        expect(processWithGemini).toHaveBeenCalled();
      });
    });

    it('does not open dialog when form validation fails', async () => {
      processWithGemini.mockClear();
      useSharedStateStore.setState(safeModeState());
      render(<WorkflowStepContainer />);

      // Do not fill required 'destination' field
      fireEvent.click(screen.getByRole('button', { name: 'Review Choices' }));

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
      expect(screen.queryByText('Review Your Choices')).not.toBeInTheDocument();
    });
  });

  it('renders Previous Step button', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('button', { name: 'Previous Step' })).toBeInTheDocument();
  });

  it('Previous Step button is disabled on the first step', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('button', { name: 'Previous Step' })).toBeDisabled();
  });

  it('Previous Step button is enabled when not on the first step', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1, STEP_2] },
        currentStepIndex: 1,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('button', { name: 'Previous Step' })).not.toBeDisabled();
  });

  it('clicking Previous Step calls goToPreviousStep', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1, STEP_2] },
        currentStepIndex: 1,
      })
    );
    render(<WorkflowStepContainer />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous Step' }));
    expect(useSharedStateStore.getState().currentStepIndex).toBe(0);
  });

  it('renders inputs from the current step', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByLabelText('Destination')).toBeInTheDocument();
  });

  it('renders the correct step when currentStepIndex is 1', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1, STEP_2] },
        currentStepIndex: 1,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Choosing travel dates.')).toBeInTheDocument();
    expect(screen.getByLabelText('Travel date')).toBeInTheDocument();
  });

  it('focuses the step title when step becomes visible', async () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        isLoading: false,
        error: null,
      })
    );
    render(<WorkflowStepContainer />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    });
  });

  it('submit saves response, calls Gemini, appends next step, and updates estimated steps', async () => {
    const nextStep = {
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      taskType: 'generic',
      stepId: 'step-2',
      stepNumber: 2,
      estimatedRemainingSteps: 1,
      stateSummary: 'Choosing dates.',
      inputs: [{ id: 'travelDate', type: 'date_input', label: 'Travel date', required: false }],
    };
    processWithGemini.mockResolvedValueOnce(nextStep);

    useSharedStateStore.setState(
      baseState({
        systemContext: 'Plan a trip',
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);

    const input = screen.getByLabelText('Destination');
    fireEvent.change(input, { target: { value: 'Rome' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Step' }));

    await waitFor(() => {
      const state = useSharedStateStore.getState();
      expect(state.workflow.steps).toHaveLength(2);
      expect(state.workflow.steps[1].stepId).toBe('step-2');
      expect(state.estimatedRemainingSteps).toBe(1);
    });

    expect(processWithGemini).toHaveBeenCalledWith(
      JSON.stringify({ destination: 'Rome' }),
      'Plan a trip',
      expect.objectContaining({ steps: expect.any(Array) }),
      expect.objectContaining({ userProfile: expect.anything(), telemetry: expect.anything() })
    );
  });

  it('submit saves the current step response in the store', async () => {
    const nextStep = {
      taskId: 'task-abc', taskName: 'Plan a Trip', taskType: 'generic',
      stepId: 'step-2', stepNumber: 2, estimatedRemainingSteps: 0,
      stateSummary: '', inputs: [{ id: 'x', type: 'text_input', label: 'X' }],
    };
    processWithGemini.mockResolvedValueOnce(nextStep);

    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);

    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Tokyo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Step' }));

    await waitFor(() => {
      const state = useSharedStateStore.getState();
      expect(state.workflow.steps[0].response).toEqual({ destination: 'Tokyo' });
    });
  });

  it('submit sets error state when Gemini throws', async () => {
    processWithGemini.mockRejectedValueOnce(new Error('Network failure'));

    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);

    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Paris' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Step' }));

    await waitFor(() => {
      expect(useSharedStateStore.getState().error).toBe('Network failure');
    });
  });

  it('aria-live polite region exists and starts empty', () => {
    render(<WorkflowStepContainer />);
    const politeRegion = document.querySelector('[aria-live="polite"]');
    expect(politeRegion).toBeInTheDocument();
    expect(politeRegion.textContent).toBe('');
  });

  it('aria-live polite region announces step number and task name when a step loads', async () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        isLoading: false,
        error: null,
      })
    );
    render(<WorkflowStepContainer />);
    await waitFor(() => {
      const politeRegion = document.querySelector('[aria-live="polite"]');
      expect(politeRegion.textContent).toBe('Step 1: Plan a Trip');
    });
  });

  it('aria-live polite region updates when step changes', async () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1, STEP_2] },
        currentStepIndex: 0,
        isLoading: false,
        error: null,
      })
    );
    render(<WorkflowStepContainer />);
    await waitFor(() => {
      const politeRegion = document.querySelector('[aria-live="polite"]');
      expect(politeRegion.textContent).toBe('Step 1: Plan a Trip');
    });

    act(() => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1, STEP_2] },
          currentStepIndex: 1,
          isLoading: false,
          error: null,
        })
      );
    });
    await waitFor(() => {
      const politeRegion = document.querySelector('[aria-live="polite"]');
      expect(politeRegion.textContent).toBe('Step 2: Plan a Trip');
    });
  });

  it('does not announce step while loading', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        isLoading: true,
      })
    );
    render(<WorkflowStepContainer />);
    const politeRegion = document.querySelector('[aria-live="polite"]');
    // On initial render with isLoading true, the announcement should not be set yet
    expect(politeRegion.textContent).toBe('');
  });

  it('step heading has tabIndex=-1 for programmatic focus management', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('renders final summary section when isFinalStep is true and finalSummary is set', () => {
    const finalStep = {
      stepId: 'step-final',
      stepNumber: 3,
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      stateSummary: 'All information collected.',
      isFinalStep: true,
      finalSummary: 'You are flying to Rome on 2024-06-01.',
      finalActionLabel: 'Confirm Booking',
      inputs: [],
      response: null,
    };
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByText('You are flying to Rome on 2024-06-01.')).toBeInTheDocument();
  });

  it('renders completion button with finalActionLabel on final step', () => {
    const finalStep = {
      stepId: 'step-final',
      stepNumber: 3,
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      stateSummary: 'Done.',
      isFinalStep: true,
      finalSummary: 'Summary text.',
      finalActionLabel: 'Confirm Booking',
      inputs: [],
      response: null,
    };
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).toBeInTheDocument();
  });

  it('uses "Complete Task" fallback label when finalActionLabel is missing', () => {
    const finalStep = {
      stepId: 'step-final',
      stepNumber: 3,
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      stateSummary: 'Done.',
      isFinalStep: true,
      finalSummary: 'All done.',
      finalActionLabel: null,
      inputs: [],
      response: null,
    };
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.getByRole('button', { name: 'Complete Task' })).toBeInTheDocument();
  });

  it('does not render Submit Step button on final step', () => {
    const finalStep = {
      stepId: 'step-final',
      stepNumber: 3,
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      stateSummary: 'Done.',
      isFinalStep: true,
      finalSummary: 'Summary.',
      finalActionLabel: 'Finish',
      inputs: [],
      response: null,
    };
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.queryByRole('button', { name: 'Submit Step' })).not.toBeInTheDocument();
  });

  it('resets workflow and clears system context when completion button is clicked', () => {
    const finalStep = {
      stepId: 'step-final',
      stepNumber: 3,
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      stateSummary: 'Done.',
      isFinalStep: true,
      finalSummary: 'Summary.',
      finalActionLabel: 'Finish',
      inputs: [],
      response: null,
    };
    useSharedStateStore.setState(
      baseState({
        systemContext: 'some context',
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    const state = useSharedStateStore.getState();
    expect(state.workflow.steps).toHaveLength(0);
    expect(state.systemContext).toBe('');
  });

  it('maps accessibility onboarding responses to userProfile on completion', () => {
    const onboardingStep = {
      stepId: 'step-final',
      stepNumber: 2,
      taskId: 'a11y-1',
      taskName: 'Accessibility Onboarding',
      taskType: 'accessibility_onboarding',
      stateSummary: 'Done.',
      isFinalStep: true,
      finalSummary: 'Profile created.',
      finalActionLabel: 'Save Profile',
      inputs: [],
      response: {
        sensory_vision: 'screen_reader',
        sensory_color: 'high_contrast',
        cognitive_safeMode: true,
        interaction_preferredModality: 'voice',
      },
    };
    useSharedStateStore.setState(
      baseState({
        systemContext: 'some context',
        workflow: { taskId: 'a11y-1', taskName: 'Accessibility Onboarding', steps: [onboardingStep] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
    const state = useSharedStateStore.getState();
    expect(state.userProfile.sensory.vision).toBe('screen_reader');
    expect(state.userProfile.sensory.color).toBe('high_contrast');
    expect(state.userProfile.cognitive.safeMode).toBe(true);
    expect(state.userProfile.interaction.preferredModality).toBe('voice');
    expect(state.workflow.steps).toHaveLength(0);
  });

  it('does not update userProfile when completing a non-onboarding workflow', () => {
    const finalStep = {
      stepId: 'step-final',
      stepNumber: 3,
      taskId: 'task-abc',
      taskName: 'Plan a Trip',
      taskType: 'generic',
      stateSummary: 'Done.',
      isFinalStep: true,
      finalSummary: 'Summary.',
      finalActionLabel: 'Finish',
      inputs: [],
      response: { sensory_vision: 'screen_reader' },
    };
    const initialProfile = {
      sensory: { vision: 'default', color: 'default' },
      cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
      interaction: { preferredModality: 'visual', progressiveDisclosure: false },
    };
    useSharedStateStore.setState(
      baseState({
        systemContext: 'some context',
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
        currentStepIndex: 0,
        userProfile: initialProfile,
      })
    );
    render(<WorkflowStepContainer />);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    const state = useSharedStateStore.getState();
    expect(state.userProfile.sensory.vision).toBe('default');
  });

  it('shows high cognitive load alert and enables decision support + safe mode when score exceeds 7', async () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        telemetry: {
          focusSwitchesCurrentStep: 0,
          timeOnCurrentStep: 0,
          errorCount: 0,
          localCognitiveLoadScore: 8,
        },
      })
    );
    render(<WorkflowStepContainer />);
    await waitFor(() => {
      expect(screen.getByText('Support Activated')).toBeInTheDocument();
      expect(screen.getByText(/We noticed this step is taking longer/)).toBeInTheDocument();
    });
    const state = useSharedStateStore.getState();
    expect(state.userProfile.cognitive.requiresDecisionSupport).toBe(true);
    expect(state.userProfile.cognitive.safeMode).toBe(true);
  });

  it('does not show high cognitive load alert when score is 7 or below', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        telemetry: {
          focusSwitchesCurrentStep: 0,
          timeOnCurrentStep: 0,
          errorCount: 0,
          localCognitiveLoadScore: 7,
        },
      })
    );
    render(<WorkflowStepContainer />);
    expect(screen.queryByText('Support Activated')).not.toBeInTheDocument();
  });

  it('only triggers cognitive load override once per step', async () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        telemetry: {
          focusSwitchesCurrentStep: 0,
          timeOnCurrentStep: 0,
          errorCount: 0,
          localCognitiveLoadScore: 9,
        },
      })
    );
    render(<WorkflowStepContainer />);
    await waitFor(() => {
      expect(screen.getByText('Support Activated')).toBeInTheDocument();
    });
    // Only one alert should be shown
    expect(screen.getAllByText('Support Activated')).toHaveLength(1);
  });

  it('resets high load alert when step changes', async () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        telemetry: {
          focusSwitchesCurrentStep: 0,
          timeOnCurrentStep: 0,
          errorCount: 0,
          localCognitiveLoadScore: 9,
        },
      })
    );
    render(<WorkflowStepContainer />);
    await waitFor(() => {
      expect(screen.getByText('Support Activated')).toBeInTheDocument();
    });

    act(() => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1, STEP_2] },
          currentStepIndex: 1,
          telemetry: {
            focusSwitchesCurrentStep: 0,
            timeOnCurrentStep: 0,
            errorCount: 0,
            localCognitiveLoadScore: 0,
          },
        })
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('Support Activated')).not.toBeInTheDocument();
    });
  });

  describe('Adaptive Keyboard Hints', () => {
    it('shows keyboard hint when localCognitiveLoadScore exceeds 6', () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 7 },
        })
      );
      render(<WorkflowStepContainer />);
      expect(screen.getByText('Keyboard Shortcuts Available')).toBeInTheDocument();
      expect(screen.getByText(/Alt \+ F/)).toBeInTheDocument();
    });

    it('does not show keyboard hint when localCognitiveLoadScore is 6 or below and safeMode is off', () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 6 },
        })
      );
      render(<WorkflowStepContainer />);
      expect(screen.queryByText('Keyboard Shortcuts Available')).not.toBeInTheDocument();
    });

    it('shows keyboard hint when safeMode is true regardless of cognitive load score', () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 0 },
          userProfile: {
            sensory: { vision: 'default', color: 'default' },
            cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: true },
            interaction: { preferredModality: 'visual', progressiveDisclosure: false },
          },
        })
      );
      render(<WorkflowStepContainer />);
      expect(screen.getByText('Keyboard Shortcuts Available')).toBeInTheDocument();
    });

    it('keyboard hint uses aria-live="polite"', () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 8 },
        })
      );
      render(<WorkflowStepContainer />);
      const hintAlert = screen.getByText('Keyboard Shortcuts Available').closest('[aria-live]');
      expect(hintAlert).toHaveAttribute('aria-live', 'polite');
    });

    it('hides keyboard hint when cognitive load drops below threshold and safeMode is off', async () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 8 },
        })
      );
      render(<WorkflowStepContainer />);
      expect(screen.getByText('Keyboard Shortcuts Available')).toBeInTheDocument();

      act(() => {
        useSharedStateStore.setState(
          baseState({
            workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
            currentStepIndex: 0,
            telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 3 },
          })
        );
      });

      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts Available')).not.toBeInTheDocument();
      });
    });

    it('does not show keyboard hint on final step', () => {
      const finalStep = {
        stepId: 'step-final',
        stepNumber: 3,
        taskId: 'task-abc',
        taskName: 'Plan a Trip',
        stateSummary: 'Done.',
        isFinalStep: true,
        finalSummary: 'Summary.',
        finalActionLabel: 'Finish',
        inputs: [],
        response: null,
      };
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 9 },
        })
      );
      render(<WorkflowStepContainer />);
      expect(screen.queryByText('Keyboard Shortcuts Available')).not.toBeInTheDocument();
    });

    it('hint mentions Alt + R and Alt + H alongside Alt + F', () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          telemetry: { ...DEFAULT_TELEMETRY, localCognitiveLoadScore: 7 },
        })
      );
      render(<WorkflowStepContainer />);
      const desc = screen.getByText(/Alt \+ F/);
      expect(desc.textContent).toContain('Alt + R');
      expect(desc.textContent).toContain('Alt + H');
    });
  });

  it('submit does not call Gemini when validation fails', async () => {
    processWithGemini.mockClear();
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowStepContainer />);

    // Do not fill in the required 'destination' field
    fireEvent.click(screen.getByRole('button', { name: 'Submit Step' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });
    expect(processWithGemini).not.toHaveBeenCalled();
  });

  describe('speech synthesis', () => {
    let mockCancel;
    let mockSpeak;

    beforeEach(() => {
      mockCancel = vi.fn();
      mockSpeak = vi.fn();
      global.window.speechSynthesis = { cancel: mockCancel, speak: mockSpeak };
      function MockUtterance(text) { this.text = text; }
      global.window.SpeechSynthesisUtterance = MockUtterance;
    });

    it('speaks semantic summary on mount when preferredModality is voice', async () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          isLoading: false,
          userProfile: {
            sensory: { vision: 'default', color: 'default' },
            cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
            interaction: { preferredModality: 'voice', progressiveDisclosure: false },
          },
        })
      );
      render(<WorkflowStepContainer />);
      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
      });
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toContain('Step 1');
      expect(utterance.text).toContain('Gathering initial trip details.');
    });

    it('does not speak when preferredModality is not voice', () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          userProfile: {
            sensory: { vision: 'default', color: 'default' },
            cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
            interaction: { preferredModality: 'visual', progressiveDisclosure: false },
          },
        })
      );
      render(<WorkflowStepContainer />);
      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('cancels speech on keydown event', async () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          userProfile: {
            sensory: { vision: 'default', color: 'default' },
            cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
            interaction: { preferredModality: 'voice', progressiveDisclosure: false },
          },
        })
      );
      render(<WorkflowStepContainer />);
      mockCancel.mockClear();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(mockCancel).toHaveBeenCalled();
    });

    it('cancels speech on mousedown event', async () => {
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
          currentStepIndex: 0,
          userProfile: {
            sensory: { vision: 'default', color: 'default' },
            cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
            interaction: { preferredModality: 'voice', progressiveDisclosure: false },
          },
        })
      );
      render(<WorkflowStepContainer />);
      mockCancel.mockClear();
      fireEvent.mouseDown(window);
      expect(mockCancel).toHaveBeenCalled();
    });

    it('does not speak on final step', () => {
      const finalStep = {
        stepId: 'step-final',
        stepNumber: 3,
        taskId: 'task-abc',
        taskName: 'Plan a Trip',
        stateSummary: 'Done.',
        isFinalStep: true,
        finalSummary: 'Summary.',
        finalActionLabel: 'Finish',
        inputs: [],
        response: null,
      };
      useSharedStateStore.setState(
        baseState({
          workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [finalStep] },
          currentStepIndex: 0,
          userProfile: {
            sensory: { vision: 'default', color: 'default' },
            cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
            interaction: { preferredModality: 'voice', progressiveDisclosure: false },
          },
        })
      );
      render(<WorkflowStepContainer />);
      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });
});
