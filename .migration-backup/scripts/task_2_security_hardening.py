#!/usr/bin/env python3
"""
Task 2: Security Hardening - Input Sanitization
Adds input validation and sanitization to Edge Functions
"""

import os

def add_security_middleware():
    print("🔒 Task 2: Adding Security Middleware to Edge Functions...")
    
    edge_function_path = "supabase/functions/assistant-proxy/index.ts"
    
    if not os.path.exists(edge_function_path):
        print(f"⚠️ File not found: {edge_function_path}")
        return False
    
    with open(edge_function_path, 'r') as f:
        content = f.read()
    
    # Check if security middleware already exists
    if "sanitizeInput" in content or "validateInput" in content:
        print("✅ Security middleware already implemented")
        return True
    
    # Add security utilities at the top of the file
    security_middleware = '''
// Security utilities
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS vectors
    .substring(0, 5000); // Limit input size
}

function validateInput(input: any): boolean {
  if (typeof input !== 'string') return false;
  if (input.length === 0 || input.length > 5000) return false;
  return true;
}

'''
    
    # Insert security middleware after imports
    import_end = content.find('\n\n', content.find('import'))
    if import_end > 0:
        content = content[:import_end] + '\n' + security_middleware + content[import_end:]
    else:
        content = security_middleware + content
    
    # Add sanitization to the main handler
    if 'const message = req.body.message' in content:
        content = content.replace(
            'const message = req.body.message',
            'const rawMessage = req.body.message;\nif (!validateInput(rawMessage)) throw new Error("Invalid input");\nconst message = sanitizeInput(rawMessage)'
        )
    
    with open(edge_function_path, 'w') as f:
        f.write(content)
    
    print("✅ Task 2 completed: Security middleware added to Edge Functions")
    return True

if __name__ == "__main__":
    success = add_security_middleware()
    exit(0 if success else 1)
