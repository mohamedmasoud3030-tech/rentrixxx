export function handleSupabaseError(error: unknown, fallbackMessage = 'حدث خطأ غير متوقع') {
  if (!error) return;
  if (error instanceof Error) throw new Error(error.message || fallbackMessage);
  throw new Error(fallbackMessage);
}
