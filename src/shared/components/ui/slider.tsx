import * as React from 'react';

import { cn } from '@/shared/lib/utils';

export interface SliderProps
  extends Omit<
    React.ComponentPropsWithoutRef<'input'>,
    'type' | 'value' | 'defaultValue' | 'onChange'
  > {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    { className, value, defaultValue, onValueChange, min, max, step, ...props },
    ref
  ) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value);
      onValueChange?.([nextValue]);
    };

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ? value[0] : undefined}
        defaultValue={defaultValue ? defaultValue[0] : undefined}
        onChange={handleChange}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary',
          className
        )}
        {...props}
      />
    );
  }
);

Slider.displayName = 'Slider';
