export function handleSupabaseError(error: unknown, fallbackMessage = 'حدث خطأ غير متوقع'): never {
  if (!error) throw new Error(fallbackMessage);
  const msg =
    (error as { message?: string }).message ||
    (error as { error_description?: string }).error_description ||
    fallbackMessage;
  throw new Error(msg);
}
