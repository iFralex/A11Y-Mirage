import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdaptiveLayoutProvider from '../app/components/AdaptiveLayoutProvider';
import { useSharedStateStore } from '../app/store/useSharedState';

beforeEach(() => {
  useSharedStateStore.setState({
    userProfile: {
      sensory: { vision: 'default', color: 'default' },
      cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
      interaction: { preferredModality: 'visual', progressiveDisclosure: false },
    },
  });
});

describe('AdaptiveLayoutProvider', () => {
  it('renders children', () => {
    render(
      <AdaptiveLayoutProvider>
        <span>hello</span>
      </AdaptiveLayoutProvider>
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('applies standard spacing by default', () => {
    render(<AdaptiveLayoutProvider><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).toContain('space-y-4');
  });

  it('applies relaxed spacing for relaxed uiDensity', () => {
    render(<AdaptiveLayoutProvider uiDensity="relaxed"><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).toContain('space-y-8');
  });

  it('applies compact spacing for compact uiDensity', () => {
    render(<AdaptiveLayoutProvider uiDensity="compact"><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).toContain('space-y-2');
  });

  it('falls back to standard spacing for unknown uiDensity', () => {
    render(<AdaptiveLayoutProvider uiDensity="unknown"><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).toContain('space-y-4');
  });

  it('does not apply contrast class when color is default', () => {
    render(<AdaptiveLayoutProvider><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).not.toContain('contrast-200');
  });

  it('applies contrast-200 class when color is high_contrast', () => {
    useSharedStateStore.setState({
      userProfile: {
        sensory: { vision: 'default', color: 'high_contrast' },
        cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
        interaction: { preferredModality: 'visual', progressiveDisclosure: false },
      },
    });
    render(<AdaptiveLayoutProvider><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).toContain('contrast-200');
  });

  it('can combine contrast and spacing classes', () => {
    useSharedStateStore.setState({
      userProfile: {
        sensory: { vision: 'default', color: 'high_contrast' },
        cognitive: { maxInputsPerStep: null, requiresDecisionSupport: false, safeMode: false },
        interaction: { preferredModality: 'visual', progressiveDisclosure: false },
      },
    });
    render(<AdaptiveLayoutProvider uiDensity="relaxed"><span>x</span></AdaptiveLayoutProvider>);
    const el = screen.getByTestId('adaptive-layout');
    expect(el.className).toContain('contrast-200');
    expect(el.className).toContain('space-y-8');
  });
});
