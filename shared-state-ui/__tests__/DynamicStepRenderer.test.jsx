import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import DynamicStepRenderer from '@/app/components/DynamicStepRenderer';

describe('DynamicStepRenderer', () => {
  it('renders nothing when inputs is empty', () => {
    const { container } = render(<DynamicStepRenderer inputs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when inputs is not provided', () => {
    const { container } = render(<DynamicStepRenderer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('skips unknown input types gracefully', () => {
    const { container } = render(
      <DynamicStepRenderer inputs={[{ id: 'x', type: 'unknown_type', label: 'X' }]} />
    );
    expect(screen.queryByLabelText('X')).not.toBeInTheDocument();
  });

  describe('text_input', () => {
    const inputs = [{ id: 'name', type: 'text_input', label: 'Your name', placeholder: 'e.g. Alice' }];

    it('renders a text input with label', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    });

    it('renders placeholder', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByPlaceholderText('e.g. Alice')).toBeInTheDocument();
    });

    it('calls onResponsesChange with updated map when typing', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Bob' } });
      expect(onChange).toHaveBeenCalledWith({ name: 'Bob' });
    });
  });

  describe('number_input', () => {
    const inputs = [{ id: 'age', type: 'number_input', label: 'Your age' }];

    it('renders a number input with label', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      const input = screen.getByLabelText('Your age');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');
    });

    it('calls onResponsesChange when value changes', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.change(screen.getByLabelText('Your age'), { target: { value: '30' } });
      expect(onChange).toHaveBeenCalledWith({ age: 30 });
    });
  });

  describe('select_option', () => {
    const inputs = [
      { id: 'city', type: 'select_option', label: 'Pick a city', options: ['Rome', 'Paris', 'Tokyo'] },
    ];

    it('renders a fieldset with legend and radio buttons', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByText('Pick a city')).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('renders labels for each option', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByLabelText('Rome')).toBeInTheDocument();
      expect(screen.getByLabelText('Paris')).toBeInTheDocument();
      expect(screen.getByLabelText('Tokyo')).toBeInTheDocument();
    });

    it('calls onResponsesChange when an option is selected', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.click(screen.getByLabelText('Paris'));
      expect(onChange).toHaveBeenCalledWith({ city: 'Paris' });
    });

    it('handles empty options array', () => {
      render(
        <DynamicStepRenderer
          inputs={[{ id: 'x', type: 'select_option', label: 'Choose', options: [] }]}
        />
      );
      expect(screen.getByText('Choose')).toBeInTheDocument();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
  });

  describe('multi_select', () => {
    const inputs = [
      { id: 'features', type: 'multi_select', label: 'Select features', options: ['A', 'B', 'C'] },
    ];

    it('renders a fieldset with checkboxes', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByText('Select features')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    });

    it('labels are linked to checkboxes', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByLabelText('A')).toBeInTheDocument();
      expect(screen.getByLabelText('B')).toBeInTheDocument();
    });

    it('calls onResponsesChange with array of selected values', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.click(screen.getByLabelText('A'));
      expect(onChange).toHaveBeenCalledWith({ features: ['A'] });
    });

    it('deselects a value when unchecked', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.click(screen.getByLabelText('A'));
      fireEvent.click(screen.getByLabelText('B'));
      fireEvent.click(screen.getByLabelText('A'));
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.features).not.toContain('A');
      expect(lastCall.features).toContain('B');
    });
  });

  describe('boolean_confirm', () => {
    const inputs = [{ id: 'agree', type: 'boolean_confirm', label: 'I agree to the terms' }];

    it('renders a checkbox with label', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByLabelText('I agree to the terms')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('calls onResponsesChange when toggled', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('date_input', () => {
    const inputs = [{ id: 'dob', type: 'date_input', label: 'Date of birth' }];

    it('renders a date input with label', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      const input = screen.getByLabelText('Date of birth');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });

    it('calls onResponsesChange when date changes', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '2000-01-01' } });
      expect(onChange).toHaveBeenCalledWith({ dob: '2000-01-01' });
    });
  });

  describe('file_upload', () => {
    const inputs = [{ id: 'resume', type: 'file_upload', label: 'Upload resume' }];

    it('renders a file input with label', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      const input = screen.getByLabelText('Upload resume');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'file');
    });
  });

  describe('rating', () => {
    const inputs = [{ id: 'score', type: 'rating', label: 'Rate your experience' }];

    it('renders a fieldset with 5 radio buttons', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByText('Rate your experience')).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(5);
    });

    it('renders labels 1 through 5', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByLabelText('1')).toBeInTheDocument();
      expect(screen.getByLabelText('5')).toBeInTheDocument();
    });

    it('calls onResponsesChange with numeric value on selection', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.click(screen.getByLabelText('4'));
      expect(onChange).toHaveBeenCalledWith({ score: 4 });
    });
  });

  describe('slider', () => {
    const inputs = [{ id: 'volume', type: 'slider', label: 'Volume' }];

    it('renders a range input with label', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      const input = screen.getByLabelText('Volume');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'range');
    });

    it('calls onResponsesChange with numeric value on change', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '75' } });
      expect(onChange).toHaveBeenCalledWith({ volume: 75 });
    });
  });

  describe('multiple inputs', () => {
    const inputs = [
      { id: 'name', type: 'text_input', label: 'Name' },
      { id: 'age', type: 'number_input', label: 'Age' },
      { id: 'city', type: 'select_option', label: 'City', options: ['Rome', 'Paris'] },
    ];

    it('renders all inputs', () => {
      render(<DynamicStepRenderer inputs={inputs} />);
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Age')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
    });

    it('accumulates responses across inputs', () => {
      const onChange = vi.fn();
      render(<DynamicStepRenderer inputs={inputs} onResponsesChange={onChange} />);
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByLabelText('Age'), { target: { value: '25' } });
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.name).toBe('Alice');
      expect(lastCall.age).toBe(25);
    });
  });

  describe('validation via ref', () => {
    const requiredInputs = [
      { id: 'name', type: 'text_input', label: 'Name', required: true },
      { id: 'age', type: 'number_input', label: 'Age', required: false },
    ];

    it('validate() returns false and shows error when required field is empty', () => {
      const ref = createRef();
      render(<DynamicStepRenderer ref={ref} inputs={requiredInputs} />);
      let result;
      act(() => { result = ref.current.validate(); });
      expect(result).toBe(false);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('validate() returns true when all required fields are filled', () => {
      const ref = createRef();
      render(<DynamicStepRenderer ref={ref} inputs={requiredInputs} />);
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice' } });
      let result;
      act(() => { result = ref.current.validate(); });
      expect(result).toBe(true);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('getResponses() returns current stepResponses', () => {
      const ref = createRef();
      render(<DynamicStepRenderer ref={ref} inputs={requiredInputs} />);
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bob' } });
      act(() => {});
      expect(ref.current.getResponses()).toEqual({ name: 'Bob' });
    });

    it('clears error for a field when its value changes', () => {
      const ref = createRef();
      render(<DynamicStepRenderer ref={ref} inputs={requiredInputs} />);
      act(() => { ref.current.validate(); });
      expect(screen.getByRole('alert')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Carol' } });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('validate() shows error for required multi_select with no selection', () => {
      const ref = createRef();
      const inputs = [{ id: 'tags', type: 'multi_select', label: 'Tags', options: ['A', 'B'], required: true }];
      render(<DynamicStepRenderer ref={ref} inputs={inputs} />);
      let result;
      act(() => { result = ref.current.validate(); });
      expect(result).toBe(false);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('validate() passes for required multi_select with at least one selection', () => {
      const ref = createRef();
      const inputs = [{ id: 'tags', type: 'multi_select', label: 'Tags', options: ['A', 'B'], required: true }];
      render(<DynamicStepRenderer ref={ref} inputs={inputs} />);
      fireEvent.click(screen.getByLabelText('A'));
      let result;
      act(() => { result = ref.current.validate(); });
      expect(result).toBe(true);
    });
  });

  describe('Focus Tunnel', () => {
    const twoInputs = [
      { id: 'name', type: 'text_input', label: 'Name' },
      { id: 'age', type: 'number_input', label: 'Age' },
    ];

    const getTunnelWrapper = (container, inputId) =>
      container.querySelector(`[data-input-tunnel="${inputId}"]`);

    it('does not apply opacity-20 when requiresDecisionSupport is false', () => {
      const { container } = render(<DynamicStepRenderer inputs={twoInputs} requiresDecisionSupport={false} />);
      const nameWrapper = getTunnelWrapper(container, 'name');
      expect(nameWrapper?.className).not.toContain('opacity-20');
    });

    it('does not dim inputs before any focus when requiresDecisionSupport is true', () => {
      const { container } = render(<DynamicStepRenderer inputs={twoInputs} requiresDecisionSupport={true} />);
      const ageWrapper = getTunnelWrapper(container, 'age');
      expect(ageWrapper?.className).not.toContain('opacity-20');
    });

    it('dims inactive inputs when requiresDecisionSupport is true and an input is focused', () => {
      const { container } = render(<DynamicStepRenderer inputs={twoInputs} requiresDecisionSupport={true} />);
      const nameInput = screen.getByLabelText('Name');
      fireEvent.focus(nameInput);

      const ageWrapper = getTunnelWrapper(container, 'age');
      expect(ageWrapper?.className).toContain('opacity-20');
      expect(ageWrapper?.className).toContain('pointer-events-none');
    });

    it('active input wrapper is not dimmed when requiresDecisionSupport is true', () => {
      const { container } = render(<DynamicStepRenderer inputs={twoInputs} requiresDecisionSupport={true} />);
      const nameInput = screen.getByLabelText('Name');
      fireEvent.focus(nameInput);

      const nameWrapper = getTunnelWrapper(container, 'name');
      expect(nameWrapper?.className).not.toContain('opacity-20');
    });

    it('clears dimming when focus leaves all inputs', () => {
      const { container } = render(<DynamicStepRenderer inputs={twoInputs} requiresDecisionSupport={true} />);
      const nameInput = screen.getByLabelText('Name');
      fireEvent.focus(nameInput);

      // Blur without relatedTarget (focus leaves the component entirely)
      fireEvent.blur(nameInput, { relatedTarget: null });

      const ageWrapper = getTunnelWrapper(container, 'age');
      expect(ageWrapper?.className).not.toContain('opacity-20');
    });

    it('does not have pointer-events-none on active input', () => {
      const { container } = render(<DynamicStepRenderer inputs={twoInputs} requiresDecisionSupport={true} />);
      const nameInput = screen.getByLabelText('Name');
      fireEvent.focus(nameInput);
      const nameWrapper = getTunnelWrapper(container, 'name');
      expect(nameWrapper?.className).not.toContain('pointer-events-none');
    });
  });
});
