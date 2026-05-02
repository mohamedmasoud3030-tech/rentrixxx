#!/usr/bin/env python3
"""
Task 5: Architecture Refactoring - Unified Error Handling
Creates a centralized error handling middleware for API calls
"""

import os

def create_error_handling_middleware():
    print("🏗️ Task 5: Refactoring Architecture with Unified Error Handling...")
    
    middleware_dir = "src/middleware"
    os.makedirs(middleware_dir, exist_ok=True)
    
    # Create unified error handler
    error_handler_path = os.path.join(middleware_dir, "errorHandler.ts")
    
    error_handler_code = '''export interface ApiError {
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
'''
    
    with open(error_handler_path, 'w') as f:
        f.write(error_handler_code)
    print(f"✅ Created error handler middleware: {error_handler_path}")
    
    # Create API client wrapper
    api_client_path = os.path.join(middleware_dir, "apiClient.ts")
    
    api_client_code = '''import { ApiErrorHandler } from './errorHandler';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      console.error('API Error:', apiError);
      throw apiError;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}
'''
    
    with open(api_client_path, 'w') as f:
        f.write(api_client_code)
    print(f"✅ Created API client wrapper: {api_client_path}")
    
    print("✅ Task 5 completed: Architecture refactoring completed")
    return True

if __name__ == "__main__":
    success = create_error_handling_middleware()
    exit(0 if success else 1)
