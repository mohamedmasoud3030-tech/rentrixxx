export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export class ApiErrorHandler {
  static handle(error: any): ApiError {
    // Handle network errors
    if (error.message === 'Network Error') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server',
        status: 0,
      };
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out',
        status: 408,
      };
    }

    // Handle HTTP errors
    if (error.response) {
      return {
        code: `HTTP_${error.response.status}`,
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        details: error.response.data,
      };
    }

    // Handle unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      status: 500,
    };
  }

  static isRetryable(error: ApiError): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'HTTP_503', 'HTTP_429'];
    return retryableCodes.includes(error.code);
  }

  static async retryWithBackoff(
    fn: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        const apiError = this.handle(error);
        if (!this.isRetryable(apiError) || i === maxRetries - 1) {
          throw apiError;
        }
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
