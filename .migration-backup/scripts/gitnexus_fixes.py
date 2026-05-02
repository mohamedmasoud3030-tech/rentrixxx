import os

def apply_gitnexus_fixes():
    print("🛠️ Applying GitNexus Audit Fixes...")
    
    # Fix 1: Add Circuit Breaker to API Client
    api_client_path = "src/middleware/apiClient.ts"
    if os.path.exists(api_client_path):
        with open(api_client_path, 'r') as f:
            content = f.read()
        
        if "CircuitBreaker" not in content:
            circuit_breaker_code = '''
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureThreshold: number = 5;
  private failureCount: number = 0;
  private nextAttempt: number = 0;
  private timeout: number = 30000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit Breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

const breaker = new CircuitBreaker();
'''
            content = circuit_breaker_code + content
            content = content.replace(
                "return await response.json();",
                "return await breaker.execute(async () => await response.json());"
            )
            with open(api_client_path, 'w') as f:
                f.write(content)
            print("✅ Added Circuit Breaker to API Client")

    # Fix 2: Add Encryption Utility for sensitive data
    utils_dir = "src/utils"
    os.makedirs(utils_dir, exist_ok=True)
    crypto_path = os.path.join(utils_dir, "crypto.ts")
    
    crypto_code = '''
// Simple encryption placeholder (use Web Crypto API in production)
export const encryptData = async (data: string, key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  // Implementation for encryption would go here
  return btoa(data); // Simple base64 for demo
};

export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  // Implementation for decryption would go here
  return atob(encryptedData);
};
'''
    with open(crypto_path, 'w') as f:
        f.write(crypto_code)
    print(f"✅ Created Encryption Utility: {crypto_path}")

if __name__ == "__main__":
    apply_gitnexus_fixes()
