type SupabaseLikeError = Readonly<{
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}>;

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return typeof error === 'object' && error !== null;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (!isSupabaseLikeError(error)) return '';
  return [error.message, error.code, error.details, error.hint].filter(Boolean).join(' ');
}

export function getActionableSupabaseErrorMessage(error: unknown, fallbackMessage = 'حدث خطأ غير متوقع') {
  const errorText = getErrorText(error);
  const normalized = errorText.toLowerCase();

  if (
    normalized.includes('permission denied')
    || normalized.includes('row-level security')
    || normalized.includes('rls')
    || normalized.includes('42501')
    || normalized.includes('unauthorized')
    || normalized.includes('not authorized')
  ) {
    return `${fallbackMessage}: لا تملك صلاحية الكتابة أو القراءة المطلوبة. اطلب من المدير مراجعة دور حسابك وصلاحيات RLS ثم أعد المحاولة.`;
  }

  if (error instanceof Error && error.message) return error.message;
  if (isSupabaseLikeError(error) && error.message) return error.message;
  return fallbackMessage;
}

export function handleSupabaseError(error: unknown, fallbackMessage = 'حدث خطأ غير متوقع') {
  if (!error) return;
  throw new Error(getActionableSupabaseErrorMessage(error, fallbackMessage));
}
