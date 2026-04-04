import React from 'react';
import { Search } from 'lucide-react';
import Input from '../ui/Input';

interface SearchFilterBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    placeholder?: string;
    children?: React.ReactNode;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ searchTerm, onSearchChange, placeholder = 'بحث...', children }) => {
    return (
        <div className="mb-4 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:flex-1">
                <Input
                    id="search-input"
                    name="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    icon={<Search className="h-5 w-5" />}
                    iconPosition="start"
                    className="w-full"
                />
            </div>
            {children ? <div className="w-full sm:w-auto">{children}</div> : null}
        </div>
    );
};

export default SearchFilterBar;
