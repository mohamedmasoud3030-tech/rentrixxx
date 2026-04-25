import { useState, useEffect } from 'react';
import { TenantService, type Tenant } from './tenantService';

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TenantService.list();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  return {
    tenants,
    loading,
    error,
    refetch: fetchTenants,
    create: async (tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTenant = await TenantService.create(tenant);
      setTenants(prev => [newTenant, ...prev]);
      return newTenant;
    },
    update: async (id: string, updates: Partial<Tenant>) => {
      const updated = await TenantService.update(id, updates);
      setTenants(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    },
    delete: async (id: string) => {
      await TenantService.delete(id);
      setTenants(prev => prev.filter(t => t.id !== id));
    },
  };
};
