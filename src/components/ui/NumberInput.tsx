import React, { useState, useEffect } from 'react';
import { normalizeLocalizedNumber } from '../../utils/helpers';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | string | undefined;
  onChange: (value: number) => void;
  allowDecimal?: boolean;
  allowNegative?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  allowDecimal = true,
  allowNegative = false,
  className = '',
  ...rest
}) => {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    // Sync parent value to display, but don't override user's active typing
    const numVal = value === undefined || value === '' || isNaN(Number(value)) ? '' : String(value);
    // Only update display if it's empty or if the normalized number differs from display
    if (numVal === '') {
      setDisplay('');
    } else if (!display) {
      // Initialize empty display with the number value (show 0 as '0', not empty)
      setDisplay(numVal);
    } else if (Number(display) !== Number(numVal)) {
      // Only sync if the actual numbers differ
      setDisplay(numVal);
    }
  }, [value, display]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeLocalizedNumber(raw);

    const negativePart = allowNegative ? '-?' : '';
    const pattern = allowDecimal
      ? new RegExp(`^${negativePart}[0-9]*(\\.[0-9]*)?$`)
      : new RegExp(`^${negativePart}[0-9]*$`);

    // Allow empty and allow minus sign for negatives
    if (normalized === '' || normalized === '-') {
      setDisplay(raw);
      onChange(0);
      return;
    }

    // Only accept if matches pattern
    if (!pattern.test(normalized)) return;

    setDisplay(raw);
    const parsed = parseFloat(normalized);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleBlur = () => {
    const normalized = normalizeLocalizedNumber(display);
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || normalized === '' || normalized === '-') {
      setDisplay('');
      onChange(0);
    } else {
      // Keep display as normalized number
      setDisplay(String(parsed));
    }
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`ltr-input ${className}`}
      dir="ltr"
      style={{
        textAlign: 'right',
        ...((rest as any).style || {}),
      }}
    />
  );
};

export default NumberInput;
