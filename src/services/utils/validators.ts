// Professional Validators - Centralized validation logic

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

class Validator {
  static email(email: string): ValidationResult {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      errors.push({
        field: 'email',
        message: 'البريد الإلكتروني مطلوب',
        code: 'EMAIL_REQUIRED'
      });
    } else if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'البريد الإلكتروني غير صحيح',
        code: 'EMAIL_INVALID'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static required(value: any, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        field: fieldName,
        message: fieldName + ' مطلوب',
        code: 'REQUIRED'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static amount(value: number, fieldName: string = 'المبلغ'): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (value < 0) {
      errors.push({
        field: fieldName,
        message: 'المبلغ لا يمكن أن يكون سالباً',
        code: 'AMOUNT_INVALID'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static dateRange(startDate: number, endDate: number): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (startDate >= endDate) {
      errors.push({
        field: 'dateRange',
        message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
        code: 'DATE_RANGE_INVALID'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Validator;
