import { useMemo } from 'react';

export const useMemoizedData = <T, R>(
  data: T[],
  filterFn?: (item: T) => boolean,
  mapFn?: (item: T) => R
): R[] => {
  return useMemo(() => {
    let result: any[] = data;

    if (filterFn) {
      result = result.filter(filterFn);
    }

    if (mapFn) {
      result = result.map(mapFn);
    }

    return result;
  }, [data, filterFn, mapFn]);
};

export const useMemoizedStats = <T>(
  data: T[],
  statsFn: (items: T[]) => Record<string, any>
): Record<string, any> => {
  return useMemo(() => statsFn(data), [data, statsFn]);
};
