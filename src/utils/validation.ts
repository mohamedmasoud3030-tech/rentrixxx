export const validateRequiredString = (value: string, fieldName: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} مطلوب`);
  }
  return trimmed;
};

export const sanitizeTextInput = (value: string): string => {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim();
};

export const validatePasswordStrength = (password: string): void => {
  if (!password || password.trim().length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    throw new Error('كلمة المرور يجب أن تحتوي على أحرف وأرقام على الأقل');
  }
};

export const validateLoginPayload = (email: string, password: string): { email: string; password: string } => {
  const safeEmail = sanitizeTextInput(validateRequiredString(email, 'البريد الإلكتروني')).toLowerCase();
  const safePassword = validateRequiredString(password, 'كلمة المرور');
  return { email: safeEmail, password: safePassword };
};

export const assertNoRoleEscalation = (
  actorRole: 'ADMIN' | 'USER',
  requestedRole: 'ADMIN' | 'USER' | undefined,
): void => {
  if (actorRole !== 'ADMIN' && requestedRole === 'ADMIN') {
    throw new Error('لا يمكن ترقية مستخدم إلى مدير بدون صلاحيات مدير.');
  }
};

export const safeAsync = async <T>(fn: () => Promise<T>, fallbackMessage: string): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(fallbackMessage);
  }
};
