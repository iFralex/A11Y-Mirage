import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkflowDebugConsole from '../app/components/WorkflowDebugConsole';
import { useSharedStateStore } from '../app/store/useSharedState';

const STEP_1 = {
  stepId: 'step-1',
  stepNumber: 1,
  taskId: 'task-abc',
  taskName: 'Plan a Trip',
  stateSummary: 'Gathering initial trip details.',
  inputs: [{ id: 'destination', type: 'text_input', label: 'Destination', required: true }],
  response: { destination: 'Rome' },
};

function baseState(overrides = {}) {
  return {
    systemContext: 'Travel assistant',
    taskData: null,
    isLoading: false,
    error: null,
    workflow: { taskId: null, taskName: '', steps: [] },
    currentStepIndex: 0,
    estimatedRemainingSteps: null,
    ...overrides,
  };
}

describe('WorkflowDebugConsole', () => {
  beforeEach(() => {
    useSharedStateStore.setState(baseState());
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('renders the debug console toggle button', () => {
    render(<WorkflowDebugConsole />);
    expect(screen.getByRole('button', { name: /debug console/i })).toBeInTheDocument();
  });

  it('panel body is hidden by default', () => {
    render(<WorkflowDebugConsole />);
    expect(screen.queryByText('Workflow State')).not.toBeInTheDocument();
  });

  it('shows panel body after clicking the toggle button', () => {
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('Workflow State')).toBeInTheDocument();
  });

  it('displays taskId and taskName when workflow has data', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        estimatedRemainingSteps: 3,
      })
    );
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('task-abc')).toBeInTheDocument();
    expect(screen.getByText('Plan a Trip')).toBeInTheDocument();
  });

  it('displays step count and estimatedRemainingSteps', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
        estimatedRemainingSteps: 7,
      })
    );
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('7')).toBeInTheDocument(); // estimatedRemaining
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // steps count appears
  });

  it('shows step history when steps exist', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('Step History')).toBeInTheDocument();
    expect(screen.getByText('Step 1 ← current')).toBeInTheDocument();
    expect(screen.getByText('step-1')).toBeInTheDocument();
  });

  it('shows "No steps yet" message when steps array is empty', () => {
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('No steps yet.')).toBeInTheDocument();
  });

  it('shows current step inputs section', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('Current Step Inputs')).toBeInTheDocument();
    expect(screen.getByText(/text_input/)).toBeInTheDocument();
  });

  it('shows "No current step" when workflow is empty', () => {
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText('No current step.')).toBeInTheDocument();
  });

  it('shows step response when available', () => {
    useSharedStateStore.setState(
      baseState({
        workflow: { taskId: 'task-abc', taskName: 'Plan a Trip', steps: [STEP_1] },
        currentStepIndex: 0,
      })
    );
    render(<WorkflowDebugConsole />);
    fireEvent.click(screen.getByRole('button', { name: /debug console/i }));
    expect(screen.getByText(/Rome/)).toBeInTheDocument();
  });

  it('button toggles aria-expanded attribute', () => {
    render(<WorkflowDebugConsole />);
    const btn = screen.getByRole('button', { name: /debug console/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the debug-console test id', () => {
    render(<WorkflowDebugConsole />);
    expect(screen.getByTestId('debug-console')).toBeInTheDocument();
  });
});
