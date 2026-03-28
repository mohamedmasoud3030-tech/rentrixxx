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
    const numVal = value === undefined || value === '' || isNaN(Number(value)) ? '' : String(value);
    if (numVal === '' || numVal === '0' && display === '') {
      return;
    }
    if (!display || Number(display) !== Number(numVal)) {
      setDisplay(numVal === '0' ? '' : numVal);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeLocalizedNumber(raw);

    const negativePart = allowNegative ? '-?' : '';
    const pattern = allowDecimal
      ? new RegExp(`^${negativePart}[0-9]*(\\.[0-9]*)?$`)
      : new RegExp(`^${negativePart}[0-9]*$`);

    if (normalized === '' || normalized === '-') {
      setDisplay(raw);
      onChange(0);
      return;
    }

    if (!pattern.test(normalized)) return;

    setDisplay(raw);
    const parsed = parseFloat(normalized);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleBlur = () => {
    const normalized = normalizeLocalizedNumber(display);
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) {
      setDisplay('');
      onChange(0);
    } else {
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
