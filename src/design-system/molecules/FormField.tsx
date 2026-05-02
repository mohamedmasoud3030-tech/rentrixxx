import React from 'react';
import { DSText } from '../atoms/DSText';

export const FormField: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, error, helper, children }) => (
  <label htmlFor={htmlFor} className="block space-y-2">
    <DSText as="span" variant="caption" className="text-text-muted">{label}</DSText>
    {children}
    {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : helper ? <p className="text-xs text-text-muted">{helper}</p> : null}
  </label>
);
