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
        <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div className="relative flex-grow">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <input
                    id="search-input"
                    name="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-md border border-border bg-card py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            {children}
        </div>
    );
};

export default SearchFilterBar;
