import { useCallback, useEffect, useState } from 'react';
import type { Database } from '../types';
import { supabaseData } from '../services/supabaseDataService';

export interface UseDataLoaderResult {
  data: Partial<Database>;
  isLoading: boolean;
  isError: boolean;
  refresh: () => Promise<void>;
  loadTable: <T extends keyof Database>(table: T) => Promise<Database[T]>;
  loadTableWhere: <T extends keyof Database>(table: T, column: string, value: unknown) => Promise<Database[T]>;
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

  const loadTable = useCallback(async <T extends keyof Database>(table: T): Promise<Database[T]> => {
    const pageSize = 500;
    let page = 1;
    let hasMore = true;
    const rows: Database[T][number][] = [];

    while (hasMore) {
      const { data: pageData, hasMore: pageHasMore } = await supabaseData.fetchPaginated<Database[T][number]>(
        table as string,
        page,
        pageSize,
      );
      rows.push(...pageData);
      hasMore = pageHasMore;
      page += 1;
    }

    const tableData = rows as Database[T];
    setData(prev => ({ ...prev, [table]: tableData }));
    return tableData;
  }, []);

  const loadTableWhere = useCallback(async <T extends keyof Database>(
    table: T,
    column: string,
    value: unknown,
  ): Promise<Database[T]> => {
    const filtered = await supabaseData.fetchWhere<Database[T][number]>(table as string, column, value);
    const tableData = filtered as Database[T];
    setData(prev => ({ ...prev, [table]: tableData }));
    return tableData;
  }, []);

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

  return { data, isLoading, isError, refresh, loadTable, loadTableWhere, addEntity, updateEntity, removeEntity };
};
