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
    {(() => {
      if (error) return <p className="text-xs font-semibold text-red-600">{error}</p>;
      if (helper) return <p className="text-xs text-text-muted">{helper}</p>;
      return null;
    })()}
  </label>
);
