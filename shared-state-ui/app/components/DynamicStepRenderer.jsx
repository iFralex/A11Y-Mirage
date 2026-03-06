'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

function validateResponses(inputs, responses) {
  const errors = {};
  inputs.forEach(({ id, required, type }) => {
    if (!required) return;
    const val = responses[id];
    if (type === 'multi_select') {
      if (!Array.isArray(val) || val.length === 0) {
        errors[id] = 'This field is required';
      }
    } else if (type === 'boolean_confirm') {
      if (!val) errors[id] = 'This must be confirmed';
    } else if (val === undefined || val === null || val === '') {
      errors[id] = 'This field is required';
    }
  });
  return errors;
}

function renderSingleInput(input, responses, updateResponses, clearError) {
  const { id, type, label, options = [], placeholder, required } = input;
  const value = responses[id] ?? '';

  const updateValue = (val) => {
    updateResponses((prev) => ({ ...prev, [id]: val }));
    clearError(id);
  };

  switch (type) {
    case 'text_input':
      return (
        <div key={id} className="flex flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            value={value}
            placeholder={placeholder || ''}
            required={!!required}
            onChange={(e) => updateValue(e.target.value)}
          />
        </div>
      );

    case 'number_input':
      return (
        <div key={id} className="flex flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="number"
            value={value}
            placeholder={placeholder || ''}
            required={!!required}
            onChange={(e) => updateValue(e.target.value)}
          />
        </div>
      );

    case 'select_option':
      return (
        <fieldset key={id}>
          <legend className="text-sm font-medium mb-3">{label}</legend>
          <RadioGroup value={value} onValueChange={updateValue}>
            {options.map((option, index) => {
              const optionId = `${id}-option-${index}`;
              return (
                <div key={optionId} className="flex items-center gap-2">
                  <RadioGroupItem value={option} id={optionId} />
                  <Label htmlFor={optionId}>{option}</Label>
                </div>
              );
            })}
          </RadioGroup>
        </fieldset>
      );

    case 'multi_select': {
      const selected = Array.isArray(responses[id]) ? responses[id] : [];
      return (
        <fieldset key={id}>
          <legend className="text-sm font-medium mb-3">{label}</legend>
          {options.map((option, index) => {
            const optionId = `${id}-option-${index}`;
            const isChecked = selected.includes(option);
            return (
              <div key={optionId} className="flex items-center gap-2 mb-1">
                <Checkbox
                  id={optionId}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateValue([...selected, option]);
                    } else {
                      updateValue(selected.filter((v) => v !== option));
                    }
                  }}
                />
                <Label htmlFor={optionId}>{option}</Label>
              </div>
            );
          })}
        </fieldset>
      );
    }

    case 'boolean_confirm':
      return (
        <div key={id} className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={!!value}
            onCheckedChange={updateValue}
          />
          <Label htmlFor={id}>{label}</Label>
        </div>
      );

    case 'date_input':
      return (
        <div key={id} className="flex flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="date"
            value={value}
            required={!!required}
            onChange={(e) => updateValue(e.target.value)}
          />
        </div>
      );

    case 'file_upload':
      return (
        <div key={id} className="flex flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="file"
            required={!!required}
            onChange={(e) => updateValue(e.target.files?.[0]?.name || '')}
          />
        </div>
      );

    case 'rating':
      return (
        <fieldset key={id}>
          <legend className="text-sm font-medium mb-3">{label}</legend>
          <RadioGroup
            value={String(value)}
            onValueChange={(v) => updateValue(Number(v))}
            className="flex flex-row gap-4"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const optionId = `${id}-rating-${n}`;
              return (
                <div key={optionId} className="flex flex-col items-center gap-1">
                  <RadioGroupItem value={String(n)} id={optionId} />
                  <Label htmlFor={optionId}>{n}</Label>
                </div>
              );
            })}
          </RadioGroup>
        </fieldset>
      );

    case 'slider':
      return (
        <div key={id} className="flex flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <input
            id={id}
            type="range"
            min={0}
            max={100}
            value={value !== '' ? value : 50}
            required={!!required}
            onChange={(e) => updateValue(Number(e.target.value))}
            className="w-full"
          />
        </div>
      );

    default:
      return null;
  }
}

const DynamicStepRenderer = forwardRef(function DynamicStepRenderer(
  { inputs = [], onResponsesChange },
  ref
) {
  const [stepResponses, setStepResponses] = useState({});
  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    validate() {
      const newErrors = validateResponses(inputs, stepResponses);
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    getResponses() {
      return stepResponses;
    },
  }));

  const updateResponses = (updater) => {
    setStepResponses((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onResponsesChange?.(next);
      return next;
    });
  };

  const clearError = (id) => {
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  if (!inputs.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {inputs.map((input) => (
        <div key={input.id}>
          {renderSingleInput(input, stepResponses, updateResponses, clearError)}
          {errors[input.id] && (
            <p role="alert" className="text-red-600 text-sm mt-1">
              {errors[input.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});

export default DynamicStepRenderer;
