export function handleSupabaseError(
  error: unknown,
  fallbackMessage = 'حدث خطأ غير متوقع'
): never {
  if (!error) throw new Error(fallbackMessage);
  throw new Error(fallbackMessage);
}
