import { useState, useEffect } from 'react';
import { InvoiceService, type Invoice } from './invoiceService';
import { AppError } from '@/services/utils/errorHandler';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await InvoiceService.list();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل الفواتير'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    loading,
    error: error?.message || null,
    refetch: fetchInvoices,
    create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newInvoice = await InvoiceService.create(invoice);
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    },
    markAsPaid: async (id: string, paidAmount: number) => {
      const updated = await InvoiceService.markAsPaid(id, paidAmount);
      setInvoices(prev => prev.map(i => i.id === id ? updated : i));
      return updated;
    },
    markAsOverdue: async (id: string) => {
      const updated = await InvoiceService.markAsOverdue(id);
      setInvoices(prev => prev.map(i => i.id === id ? updated : i));
      return updated;
    },
  };
};
