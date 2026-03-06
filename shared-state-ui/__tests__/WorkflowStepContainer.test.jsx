import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowStepContainer from '../app/components/WorkflowStepContainer';
import { useSharedStateStore } from '../app/store/useSharedState';

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
});
