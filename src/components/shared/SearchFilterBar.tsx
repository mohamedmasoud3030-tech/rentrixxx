import React from 'react';
import { Search } from 'lucide-react';

interface SearchFilterBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    placeholder?: string;
    children?: React.ReactNode;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ searchTerm, onSearchChange, placeholder = 'بحث...', children }) => {
    return (
        <div className="mb-4 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
                <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant" />
                <input
                    id="search-input"
                    name="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pe-10 bg-surface-container-high border-none"
                />
            </div>
            {children ? <div className="w-full sm:w-auto">{children}</div> : null}
        </div>
    );
};

export default SearchFilterBar;
