import { useMemo, useState } from 'react';

export function useBulkSelection<TId extends string | number>(allIds: readonly TId[]) {
  const [selectedIds, setSelectedIds] = useState<Set<TId>>(() => new Set<TId>());

  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const selectedCount = selectedIds.size;

  const isSelected = (id: TId) => selectedIds.has(id);

  const toggleOne = (id: TId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) {
        return new Set<TId>();
      }
      return new Set(allIds);
    });
  };

  const clear = () => setSelectedIds(new Set<TId>());

  return useMemo(() => ({ selectedIds, selectedCount, allSelected, isSelected, toggleOne, toggleAll, clear }), [selectedIds, selectedCount, allSelected]);
}
