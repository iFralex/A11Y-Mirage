import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DynamicStepRenderer from '../DynamicStepRenderer';

describe('DynamicStepRenderer - step navigation', () => {
  const inputs = [
    { id: 'city', type: 'text_input', label: 'City', required: true },
    { id: 'mode', type: 'select_option', label: 'Travel mode', options: ['Train', 'Bus', 'Car'] },
  ];

  it('initializes inputs as empty when no initialResponses provided', () => {
    const ref = { current: null };
    render(<DynamicStepRenderer ref={ref} inputs={inputs} />);
    const cityInput = screen.getByLabelText('City');
    expect(cityInput.value).toBe('');
  });

  it('pre-populates inputs from initialResponses when navigating back', () => {
    const savedResponses = { city: 'Rome', mode: 'Train' };
    render(
      <DynamicStepRenderer
        inputs={inputs}
        initialResponses={savedResponses}
      />
    );
    const cityInput = screen.getByLabelText('City');
    expect(cityInput.value).toBe('Rome');
  });

  it('allows editing inputs when navigating back to a previous step', () => {
    const savedResponses = { city: 'Rome' };
    render(
      <DynamicStepRenderer
        inputs={[{ id: 'city', type: 'text_input', label: 'City', required: true }]}
        initialResponses={savedResponses}
      />
    );
    const cityInput = screen.getByLabelText('City');
    fireEvent.change(cityInput, { target: { value: 'Milan' } });
    expect(cityInput.value).toBe('Milan');
  });

  it('getResponses returns initialResponses values before any edits', () => {
    const savedResponses = { city: 'Rome' };
    const ref = { current: null };
    const { rerender } = render(
      <DynamicStepRenderer
        ref={ref}
        inputs={[{ id: 'city', type: 'text_input', label: 'City' }]}
        initialResponses={savedResponses}
      />
    );
    expect(ref.current.getResponses()).toEqual({ city: 'Rome' });
  });
});
