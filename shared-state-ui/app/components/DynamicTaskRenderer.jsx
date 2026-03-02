'use client';

import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DynamicTaskRenderer({ pendingAction, onResponseChange }) {
  const [selectedValue, setSelectedValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [textValue, setTextValue] = useState('');

  if (!pendingAction) return null;

  switch (pendingAction.type) {
    case 'select_option':
      return (
        <fieldset>
          <legend className="text-sm font-medium mb-3">{pendingAction.question}</legend>
          <RadioGroup
            value={selectedValue}
            onValueChange={(v) => { setSelectedValue(v); onResponseChange?.(v); }}
          >
            {(pendingAction.options || []).map((option, index) => {
              const id = `radio-option-${index}-${option.replace(/\s+/g, '-').toLowerCase()}`;
              return (
                <div key={id} className="flex items-center gap-2">
                  <RadioGroupItem value={option} id={id} />
                  <Label htmlFor={id}>{option}</Label>
                </div>
              );
            })}
          </RadioGroup>
        </fieldset>
      );

    case 'boolean_confirm':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id="confirm-action"
            checked={checked}
            onCheckedChange={(v) => { setChecked(v); onResponseChange?.(v); }}
          />
          <Label htmlFor="confirm-action">{pendingAction.question}</Label>
        </div>
      );

    case 'text_input':
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor="text-input-field">{pendingAction.question}</Label>
          <Input
            id="text-input-field"
            value={textValue}
            onChange={(e) => { setTextValue(e.target.value); onResponseChange?.(e.target.value); }}
          />
        </div>
      );

    default:
      return null;
  }
}
