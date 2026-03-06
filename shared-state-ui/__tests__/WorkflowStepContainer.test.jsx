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

function baseState(overrides = {}) {
  return {
    systemContext: '',
    taskData: null,
    isLoading: false,
    error: null,
    workflow: { taskId: null, taskName: '', steps: [] },
    currentStepIndex: 0,
    estimatedRemainingSteps: null,
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
      expect.objectContaining({ steps: expect.any(Array) })
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
});
