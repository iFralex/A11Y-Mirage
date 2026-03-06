import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../app/page';
import { useSharedStateStore } from '../app/store/useSharedState';

vi.mock('../app/actions/processUserInput', () => ({
  processWithGemini: vi.fn(),
}));

vi.mock('../app/components/WorkflowStepContainer', () => ({
  default: () => <div data-testid="workflow-step-container" />,
}));

import { processWithGemini } from '../app/actions/processUserInput';

const mockFirstStep = {
  taskId: 'task-1',
  taskType: 'generic',
  taskName: 'Test Task',
  stepId: 'step-1',
  stepNumber: 1,
  estimatedRemainingSteps: 3,
  stateSummary: 'Starting',
  inputs: [{ id: 'q1', type: 'text_input', label: 'Q?', required: true }],
};

describe('Home page', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: '',
      taskData: null,
      workflow: { taskId: null, taskName: '', steps: [] },
      currentStepIndex: 0,
      estimatedRemainingSteps: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders ContextSetup when systemContext is empty', () => {
    render(<Home />);
    expect(screen.getByText('Inizializzazione del Contesto')).toBeInTheDocument();
  });

  it('renders the prompt form when systemContext is set and no workflow steps', () => {
    useSharedStateStore.setState({ systemContext: 'some context' });
    render(<Home />);
    expect(screen.getByLabelText('La tua richiesta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invia Richiesta' })).toBeInTheDocument();
  });

  it('renders WorkflowStepContainer when workflow has steps', () => {
    useSharedStateStore.setState({
      systemContext: 'some context',
      workflow: { taskId: 'task-1', taskName: 'Test', steps: [mockFirstStep] },
    });
    render(<Home />);
    expect(screen.getByTestId('workflow-step-container')).toBeInTheDocument();
    expect(screen.queryByLabelText('La tua richiesta')).not.toBeInTheDocument();
  });

  it('does not render prompt form when systemContext is empty', () => {
    render(<Home />);
    expect(screen.queryByRole('button', { name: 'Invia Richiesta' })).not.toBeInTheDocument();
  });

  it('calls processWithGemini with prompt, context, and empty workflow on first submit', async () => {
    useSharedStateStore.setState({ systemContext: 'test context' });
    processWithGemini.mockResolvedValueOnce(mockFirstStep);

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'my prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(processWithGemini).toHaveBeenCalledWith(
        'my prompt',
        'test context',
        { taskId: null, taskName: '', steps: [] }
      );
    });
  });

  it('calls addStep and setEstimatedSteps on success', async () => {
    useSharedStateStore.setState({ systemContext: 'test context' });
    processWithGemini.mockResolvedValueOnce(mockFirstStep);

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'my prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(useSharedStateStore.getState().workflow.steps).toHaveLength(1);
      expect(useSharedStateStore.getState().workflow.steps[0]).toMatchObject(mockFirstStep);
      expect(useSharedStateStore.getState().estimatedRemainingSteps).toBe(3);
      expect(useSharedStateStore.getState().isLoading).toBe(false);
    });
  });

  it('calls setError and setLoading(false) on failure', async () => {
    useSharedStateStore.setState({ systemContext: 'test context' });
    processWithGemini.mockRejectedValueOnce(new Error('Errore di connessione al modello.'));

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'bad request' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(useSharedStateStore.getState().error).toBe('Errore di connessione al modello.');
      expect(useSharedStateStore.getState().isLoading).toBe(false);
    });
  });

  it('sets isLoading to true before processWithGemini resolves', async () => {
    useSharedStateStore.setState({ systemContext: 'test context' });
    let resolvePromise;
    processWithGemini.mockReturnValueOnce(
      new Promise((r) => { resolvePromise = r; })
    );

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'my prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(useSharedStateStore.getState().isLoading).toBe(true);
    });

    resolvePromise(mockFirstStep);

    await waitFor(() => {
      expect(useSharedStateStore.getState().isLoading).toBe(false);
    });
  });

  it('clears a previous error before submitting a new request', async () => {
    useSharedStateStore.setState({ systemContext: 'test context', error: 'previous error' });
    processWithGemini.mockResolvedValueOnce(mockFirstStep);

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'new prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(useSharedStateStore.getState().error).toBeNull();
    });
  });
});
