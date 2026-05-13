import React from 'react';
import { Search } from 'lucide-react';

interface SearchFilterBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    placeholder?: string;
    children?: React.ReactNode; // For additional filter controls
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ searchTerm, onSearchChange, placeholder = "بحث...", children }) => {
    return (
        <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <input
                    id="search-input"
                    name="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pr-10"
                />
            </div>
            {children ? <div className="w-full sm:w-auto">{children}</div> : null}
        </div>
    );
};

export default SearchFilterBar;
