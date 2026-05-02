import { useCallback, useEffect, useState } from 'react';
import type { Database } from '../types';

type ArrayTableKey = {
  [K in keyof Database]: Database[K] extends Array<unknown> ? K : never
}[keyof Database];
type TableEntity<T extends ArrayTableKey> = Database[T] extends Array<infer U> ? U : never;

export interface UseDataLoaderResult {
  data: Partial<Database>;
  isLoading: boolean;
  isError: boolean;
  refresh: () => Promise<void>;
  addEntity: <T extends ArrayTableKey>(table: T, entity: TableEntity<T>) => void;
  updateEntity: <T extends ArrayTableKey>(table: T, id: string, updates: Partial<TableEntity<T>>) => void;
  removeEntity: <T extends ArrayTableKey>(table: T, id: string) => void;
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

  const addEntity = useCallback(<T extends ArrayTableKey>(table: T, entity: TableEntity<T>) => {
    setData(prev => {
      const current = (prev[table] as TableEntity<T>[] | undefined) || [];
      return { ...prev, [table]: [...current, entity] };
    });
  }, []);

  const updateEntity = useCallback(<T extends ArrayTableKey>(table: T, id: string, updates: Partial<TableEntity<T>>) => {
    setData(prev => {
      const current = ((prev[table] as TableEntity<T>[] | undefined) || []) as Array<TableEntity<T> & { id: string }>;
      const next = current.map(row => (row.id === id ? { ...row, ...updates } : row));
      return { ...prev, [table]: next };
    });
  }, []);

  const removeEntity = useCallback(<T extends ArrayTableKey>(table: T, id: string) => {
    setData(prev => {
      const current = ((prev[table] as TableEntity<T>[] | undefined) || []) as Array<TableEntity<T> & { id: string }>;
      return { ...prev, [table]: current.filter(row => row.id !== id) };
    });
  }, []);

  return { data, isLoading, isError, refresh, addEntity, updateEntity, removeEntity };
};
