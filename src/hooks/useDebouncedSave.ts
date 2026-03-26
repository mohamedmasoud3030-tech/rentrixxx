import { useCallback, useRef, useEffect } from 'react';

export const useDebouncedSave = (
  saveFunc: (data: any) => Promise<void>,
  delay: number = 1000
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const debouncedSave = useCallback(
    async (data: any) => {
      const dataStr = JSON.stringify(data);

      // منع التكرار إذا كانت البيانات نفسها
      if (dataStr === lastSaveRef.current || isSavingRef.current) {
        return;
      }

      // إلغاء الحفظ السابق المعلق
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          isSavingRef.current = true;
          await saveFunc(data);
          lastSaveRef.current = dataStr;
        } finally {
          isSavingRef.current = false;
        }
      }, delay);
    },
    [saveFunc, delay]
  );

  // تنظيف عند الـ unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedSave;
};
