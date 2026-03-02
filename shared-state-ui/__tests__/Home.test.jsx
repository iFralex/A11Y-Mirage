import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../app/page';
import { useSharedStateStore } from '../app/store/useSharedState';

vi.mock('../app/actions/processUserInput', () => ({
  processWithGemini: vi.fn(),
}));

vi.mock('../app/components/DynamicTaskContainer', () => ({
  default: () => <div data-testid="dynamic-task-container" />,
}));

import { processWithGemini } from '../app/actions/processUserInput';

describe('Home page', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: '',
      taskData: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders ContextSetup when systemContext is empty', () => {
    render(<Home />);
    expect(screen.getByText('Inizializzazione del Contesto')).toBeInTheDocument();
  });

  it('renders the prompt form when systemContext is set', () => {
    useSharedStateStore.setState({ systemContext: 'some context' });
    render(<Home />);
    expect(screen.getByLabelText('La tua richiesta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invia Richiesta' })).toBeInTheDocument();
  });

  it('renders DynamicTaskContainer when systemContext is set', () => {
    useSharedStateStore.setState({ systemContext: 'some context' });
    render(<Home />);
    expect(screen.getByTestId('dynamic-task-container')).toBeInTheDocument();
  });

  it('does not render prompt form when systemContext is empty', () => {
    render(<Home />);
    expect(screen.queryByRole('button', { name: 'Invia Richiesta' })).not.toBeInTheDocument();
  });

  it('calls processWithGemini on form submit with prompt and context', async () => {
    useSharedStateStore.setState({ systemContext: 'test context' });
    processWithGemini.mockResolvedValueOnce({
      taskId: '1',
      taskType: 'meeting_coordination',
      stateSummary: 'Summary',
      pendingAction: { type: 'text_input', question: 'Q?', options: [] },
    });

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'my prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(processWithGemini).toHaveBeenCalledWith('my prompt', 'test context');
    });
  });

  it('calls updateTaskData and setLoading(false) on success', async () => {
    useSharedStateStore.setState({ systemContext: 'test context' });
    const mockResult = {
      taskId: '1',
      taskType: 'document_approval',
      stateSummary: 'Doc summary',
      pendingAction: { type: 'boolean_confirm', question: 'Approve?', options: [] },
    };
    processWithGemini.mockResolvedValueOnce(mockResult);

    render(<Home />);
    const textarea = screen.getByLabelText('La tua richiesta');
    fireEvent.change(textarea, { target: { value: 'approve doc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia Richiesta' }));

    await waitFor(() => {
      expect(useSharedStateStore.getState().taskData).toEqual(mockResult);
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
});
