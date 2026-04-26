import { useState, useEffect } from 'react';
import { PropertyService, type Property } from './propertyService';
import { AppError } from '@/services/utils/errorHandler';

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PropertyService.list();
      setProperties(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل الممتلكات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return {
    properties,
    loading,
    error: error?.message || null,
    refetch: fetchProperties,
    create: async (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newProperty = await PropertyService.create(property);
      setProperties(prev => [newProperty, ...prev]);
      return newProperty;
    },
    update: async (id: string, updates: Partial<Property>) => {
      const updated = await PropertyService.update(id, updates);
      setProperties(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    },
    delete: async (id: string) => {
      await PropertyService.delete(id);
      setProperties(prev => prev.filter(p => p.id !== id));
    },
  };
};
