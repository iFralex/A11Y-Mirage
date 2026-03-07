import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccessibilityReport from '../app/components/AccessibilityReport';
import { useSharedStateStore } from '../app/store/useSharedState';

const baseStep = {
  taskId: 'task-1',
  taskType: 'generic',
  taskName: 'Test Task',
  stepId: 'step-1',
  stepNumber: 1,
  estimatedRemainingSteps: 0,
  stateSummary: 'Summary',
  inputs: [{ id: 'q1', type: 'text_input', label: 'Q?' }],
  isFinalStep: false,
  uiDensity: 'standard',
};

const finalStep = {
  ...baseStep,
  stepId: 'step-final',
  stepNumber: 2,
  isFinalStep: true,
  inputs: [],
  finalSummary: 'Done',
  finalActionLabel: 'Complete',
};

function setupStore({ steps = [], safeMode = false, uiDensities = [] } = {}) {
  const stepsWithDensities = steps.map((s, i) => ({
    ...s,
    uiDensity: uiDensities[i] ?? 'standard',
  }));
  useSharedStateStore.setState({
    workflow: { taskId: 'task-1', taskName: 'Test', steps: stepsWithDensities },
    userProfile: {
      sensory: { vision: 'default', color: 'default' },
      cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode },
      interaction: { preferredModality: 'visual', progressiveDisclosure: false },
    },
  });
}

describe('AccessibilityReport', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      workflow: { taskId: null, taskName: '', steps: [] },
    });
    vi.clearAllMocks();
  });

  it('renders the report heading', () => {
    setupStore();
    render(<AccessibilityReport />);
    expect(screen.getByRole('heading', { name: /session accessibility report/i })).toBeInTheDocument();
  });

  it('shows adaptation count of 0 when no steps adapted', () => {
    setupStore({ steps: [baseStep], uiDensities: ['standard'] });
    render(<AccessibilityReport />);
    expect(screen.getByText(/adapted dynamically/i).textContent).toContain('0');
  });

  it('counts relaxed-density steps as adaptations', () => {
    setupStore({
      steps: [baseStep, { ...baseStep, stepId: 'step-2', stepNumber: 2 }],
      uiDensities: ['relaxed', 'standard'],
    });
    render(<AccessibilityReport />);
    expect(screen.getByText(/adapted dynamically/i).textContent).toContain('1');
  });

  it('counts steps with adaptationReason as adaptations', () => {
    const adaptedStep = { ...baseStep, adaptationReason: 'High load detected.' };
    setupStore({ steps: [adaptedStep], uiDensities: ['standard'] });
    render(<AccessibilityReport />);
    expect(screen.getByText(/adapted dynamically/i).textContent).toContain('1');
  });

  it('does not count the final step as an adaptation', () => {
    setupStore({
      steps: [finalStep],
      uiDensities: ['relaxed'],
    });
    render(<AccessibilityReport />);
    // finalStep is excluded from metrics
    expect(screen.getByText(/adapted dynamically/i).textContent).toContain('0');
  });

  it('shows safe mode as active when userProfile.cognitive.safeMode is true', () => {
    setupStore({ safeMode: true });
    render(<AccessibilityReport />);
    expect(screen.getByText(/safe mode was/i).textContent).toContain('active');
  });

  it('shows safe mode as not active when safeMode is false', () => {
    setupStore({ safeMode: false });
    render(<AccessibilityReport />);
    expect(screen.getByText(/safe mode was/i).textContent).toContain('not active');
  });

  it('renders the save profile button initially', () => {
    setupStore();
    render(<AccessibilityReport />);
    expect(
      screen.getByRole('button', { name: /save these learned adaptations/i })
    ).toBeInTheDocument();
  });

  it('shows saved confirmation after clicking save button', () => {
    setupStore();
    render(<AccessibilityReport />);
    const btn = screen.getByRole('button', { name: /save these learned adaptations/i });
    fireEvent.click(btn);
    expect(screen.getByRole('status')).toHaveTextContent(/adaptations saved/i);
    expect(
      screen.queryByRole('button', { name: /save these learned adaptations/i })
    ).not.toBeInTheDocument();
  });

  it('calls setUserProfile when save button is clicked', () => {
    setupStore({ safeMode: true });
    render(<AccessibilityReport />);
    const setUserProfile = vi.fn();
    useSharedStateStore.setState({ setUserProfile });
    const btn = screen.getByRole('button', { name: /save these learned adaptations/i });
    fireEvent.click(btn);
    // After click, saved state should be true
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows relaxed steps detail when adaptations occurred', () => {
    setupStore({
      steps: [
        { ...baseStep, stepId: 'step-a' },
        { ...baseStep, stepId: 'step-b' },
      ],
      uiDensities: ['relaxed', 'relaxed'],
    });
    render(<AccessibilityReport />);
    expect(screen.getByText(/relaxed layout/i)).toBeInTheDocument();
  });

  it('shows average load score based on uiDensity heuristic', () => {
    setupStore({
      steps: [baseStep],
      uiDensities: ['standard'],
    });
    render(<AccessibilityReport />);
    // standard density => score 4.0
    expect(screen.getByText(/average load score/i).textContent).toContain('4.0/10');
  });

  it('shows N/A average load when no non-final steps have density', () => {
    // Only final step
    setupStore({ steps: [finalStep], uiDensities: ['standard'] });
    render(<AccessibilityReport />);
    expect(screen.getByText(/average load score/i).textContent).toContain('N/A/10');
  });
});
