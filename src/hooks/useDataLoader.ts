import { useCallback, useEffect, useState } from 'react';
import type { Database } from '../types';

export interface UseDataLoaderResult {
  data: Partial<Database>;
  isLoading: boolean;
  isError: boolean;
  refresh: () => Promise<void>;
  addEntity: <T extends keyof Database>(table: T, entity: Database[T][number]) => void;
  updateEntity: <T extends keyof Database>(table: T, id: string, updates: Partial<Database[T][number]>) => void;
  removeEntity: <T extends keyof Database>(table: T, id: string) => void;
}

export const useDataLoader = (
  getAllData: () => Promise<Partial<Database>>,
  initial: Partial<Database> = {},
): UseDataLoaderResult => {
  const [data, setData] = useState<Partial<Database>>(initial);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const allData = await getAllData();
      setData(allData);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [getAllData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntity = useCallback(<T extends keyof Database>(table: T, entity: Database[T][number]) => {
    setData(prev => {
      const current = (prev[table] as Database[T]) || ([] as unknown as Database[T]);
      return { ...prev, [table]: [...current, entity] };
    });
  }, []);

  const updateEntity = useCallback(<T extends keyof Database>(table: T, id: string, updates: Partial<Database[T][number]>) => {
    setData(prev => {
      const current = ((prev[table] as Database[T]) || ([] as unknown as Database[T])) as Array<Database[T][number] & { id: string }>;
      const next = current.map(row => (row.id === id ? { ...row, ...updates } : row));
      return { ...prev, [table]: next as Database[T] };
    });
  }, []);

  const removeEntity = useCallback(<T extends keyof Database>(table: T, id: string) => {
    setData(prev => {
      const current = ((prev[table] as Database[T]) || ([] as unknown as Database[T])) as Array<Database[T][number] & { id: string }>;
      return { ...prev, [table]: current.filter(row => row.id !== id) as Database[T] };
    });
  }, []);

  return { data, isLoading, isError, refresh, addEntity, updateEntity, removeEntity };
};
