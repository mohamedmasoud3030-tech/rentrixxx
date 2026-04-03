export const validateRequiredString = (value: string, fieldName: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} مطلوب`);
  }
  return trimmed;
};

export const validatePasswordStrength = (password: string): void => {
  if (!password || password.trim().length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
};

export const validateLoginPayload = (email: string, password: string): { email: string; password: string } => {
  const safeEmail = validateRequiredString(email, 'البريد الإلكتروني');
  const safePassword = validateRequiredString(password, 'كلمة المرور');
  return { email: safeEmail, password: safePassword };
};

export const safeAsync = async <T>(fn: () => Promise<T>, fallbackMessage: string): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(fallbackMessage);
  }
};

export const validateNonNegativeNumber = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return value;
};
