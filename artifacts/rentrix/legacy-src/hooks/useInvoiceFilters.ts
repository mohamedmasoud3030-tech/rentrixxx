import { useState, useEffect } from 'react';
import { InvoiceFiltersState, InvoiceStatus, InvoiceType } from '../utils/invoices/types';

const STORAGE_KEY = 'rentrix:invoices_filters';

const DEFAULT_FILTERS: InvoiceFiltersState = {
  status: 'all',
  type: 'all',
  dateFrom: '',
  dateTo: '',
  search: '',
};

export const useInvoiceFilters = () => {
  const [filters, setFilters] = useState<InvoiceFiltersState>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_FILTERS, ...JSON.parse(stored) } : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const updateStatus = (status: InvoiceStatus) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const updateType = (type: InvoiceType) => {
    setFilters(prev => ({ ...prev, type }));
  };

  const updateSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const updateDateRange = (dateFrom: string, dateTo: string) => {
    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    updateStatus,
    updateType,
    updateSearch,
    updateDateRange,
    reset,
  };
};
