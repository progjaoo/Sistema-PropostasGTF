import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

interface ColorPickerFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function normalizeHexColor(value: string) {
  const cleaned = value.trim().toUpperCase();
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

export function ColorPickerField({ id, value, onChange, disabled, className }: ColorPickerFieldProps) {
  const normalizedValue = normalizeHexColor(value || '#427EFF');
  const pickerValue = HEX_COLOR_PATTERN.test(normalizedValue) ? normalizedValue : '#427EFF';

  return (
    <div className={cn('grid grid-cols-[48px_minmax(0,1fr)] gap-3', className)}>
      <label
        className="relative flex h-10 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-background"
        htmlFor={`${id || 'primary-color'}-picker`}
        title="Selecionar cor"
      >
        <span className="h-full w-full" style={{ backgroundColor: pickerValue }} aria-hidden="true" />
        <input
          id={`${id || 'primary-color'}-picker`}
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label="Selecionar cor da proposta"
        />
      </label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        maxLength={7}
        placeholder="#427EFF"
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        onBlur={() => onChange(normalizeHexColor(value))}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
