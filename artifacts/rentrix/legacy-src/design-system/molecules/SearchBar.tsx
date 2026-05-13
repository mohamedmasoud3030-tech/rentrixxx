import React from 'react';
import { Search } from 'lucide-react';
import { DSInput } from '../atoms/DSInput';
import { DSIcon } from '../atoms/DSIcon';

export const SearchBar: React.FC<{ value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }> = ({
  value,
  onChange,
  placeholder = 'بحث...',
  disabled,
}) => (
  <div className="relative w-full">
    <DSIcon size="md" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
      <Search />
    </DSIcon>
    <DSInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-10" disabled={disabled} />
  </div>
);
