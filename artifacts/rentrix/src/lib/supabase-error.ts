export function handleSupabaseError(error: unknown, fallbackMessage = 'حدث خطأ غير متوقع'): never {
  if (error) console.error('Supabase Error:', error);
  throw new Error(fallbackMessage);
}
