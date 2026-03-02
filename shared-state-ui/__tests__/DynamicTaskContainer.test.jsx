import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DynamicTaskContainer from '../app/components/DynamicTaskContainer';
import { useSharedStateStore } from '../app/store/useSharedState';

describe('DynamicTaskContainer', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: '',
      taskData: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders nothing visible when there is no taskData and not loading', () => {
    render(<DynamicTaskContainer />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders sr-only loading text when isLoading is true', () => {
    useSharedStateStore.setState({ isLoading: true });
    render(<DynamicTaskContainer />);
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion.textContent).toBe('Elaborazione in corso...');
  });

  it('renders a visual spinner when isLoading is true', () => {
    useSharedStateStore.setState({ isLoading: true });
    const { container } = render(<DynamicTaskContainer />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders error Alert when error is set', () => {
    useSharedStateStore.setState({ error: 'Errore di connessione al modello.' });
    render(<DynamicTaskContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Errore di connessione al modello.')).toBeInTheDocument();
  });

  it('renders task heading with taskType when taskData is present', () => {
    useSharedStateStore.setState({
      taskData: {
        taskId: '1',
        taskType: 'meeting_coordination',
        stateSummary: 'Riunione da coordinare.',
        pendingAction: { type: 'text_input', question: 'Titolo della riunione?', options: [] },
      },
    });
    render(<DynamicTaskContainer />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Task: meeting_coordination');
  });

  it('renders stateSummary when taskData is present', () => {
    useSharedStateStore.setState({
      taskData: {
        taskId: '1',
        taskType: 'document_approval',
        stateSummary: 'Documento in attesa di approvazione.',
        pendingAction: { type: 'boolean_confirm', question: 'Approvare?', options: [] },
      },
    });
    render(<DynamicTaskContainer />);
    expect(screen.getByText('Documento in attesa di approvazione.')).toBeInTheDocument();
  });

  it('renders the Conferma button when taskData is present', () => {
    useSharedStateStore.setState({
      taskData: {
        taskId: '2',
        taskType: 'data_collection',
        stateSummary: 'Raccolta dati in corso.',
        pendingAction: { type: 'text_input', question: 'Inserisci dati:', options: [] },
      },
    });
    render(<DynamicTaskContainer />);
    expect(screen.getByRole('button', { name: 'Conferma' })).toBeInTheDocument();
  });

  it('renders with role="region" and uses aria-label when taskData is absent', () => {
    render(<DynamicTaskContainer />);
    const region = screen.getByRole('region');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-label', 'Sezione task AI');
    expect(region).not.toHaveAttribute('aria-labelledby');
  });

  it('renders with role="region" and aria-labelledby="task-title" when taskData is present', () => {
    useSharedStateStore.setState({
      taskData: {
        taskId: '3',
        taskType: 'meeting_coordination',
        stateSummary: 'Test',
        pendingAction: { type: 'text_input', question: 'Q?', options: [] },
      },
    });
    render(<DynamicTaskContainer />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-labelledby', 'task-title');
    expect(region).not.toHaveAttribute('aria-label');
  });

  it('aria-live region is empty when not loading', () => {
    useSharedStateStore.setState({ isLoading: false });
    render(<DynamicTaskContainer />);
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion.textContent).toBe('');
  });

  it('focuses the task title when taskData is set and loading is complete', async () => {
    useSharedStateStore.setState({
      taskData: {
        taskId: '4',
        taskType: 'data_collection',
        stateSummary: 'Test focus.',
        pendingAction: { type: 'text_input', question: 'Q?', options: [] },
      },
      isLoading: false,
      error: null,
    });
    render(<DynamicTaskContainer />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    });
  });
});
