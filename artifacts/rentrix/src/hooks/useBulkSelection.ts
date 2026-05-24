import { useCallback, useEffect, useMemo, useState } from 'react';

export function useBulkSelection<TId extends string | number>(allIds: readonly TId[]) {
  const [selectedIds, setSelectedIds] = useState<Set<TId>>(() => new Set<TId>());
  const allIdsSet = useMemo(() => new Set(allIds), [allIds]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => allIdsSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [allIdsSet]);

  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const selectedCount = Array.from(selectedIds).filter((id) => allIdsSet.has(id)).length;

  const isSelected = useCallback((id: TId) => selectedIds.has(id), [selectedIds]);

  const toggleOne = useCallback((id: TId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) {
        return new Set<TId>();
      }
      return new Set(allIds);
    });
  }, [allIds]);

  const clear = useCallback(() => setSelectedIds(new Set<TId>()), []);

  return useMemo(
    () => ({ selectedIds, selectedCount, allSelected, isSelected, toggleOne, toggleAll, clear }),
    [selectedIds, selectedCount, allSelected, isSelected, toggleOne, toggleAll, clear],
  );
}
