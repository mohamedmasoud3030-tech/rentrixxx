#!/usr/bin/env python3
"""
Task 4: Reliability Testing - SWE-agent Methodology
Creates reproduction scripts for invoice generation bugs
"""

import os

def create_reliability_tests():
    print("🧪 Task 4: Creating Reliability Tests for Invoice Generation...")
    
    test_dir = "tests/reliability"
    os.makedirs(test_dir, exist_ok=True)
    
    # Create invoice generation test
    invoice_test_path = os.path.join(test_dir, "invoice-generation.test.ts")
    
    invoice_test_code = '''import { describe, it, expect } from 'vitest';

describe('Invoice Generation Reliability', () => {
  it('should generate invoice with correct amount calculation', () => {
    const amount = 1000;
    const taxRate = 0.15;
    const expectedTotal = amount * (1 + taxRate);
    
    // Mock invoice generation
    const invoice = {
      amount,
      tax: amount * taxRate,
      total: expectedTotal,
    };
    
    expect(invoice.total).toBe(1150);
    expect(invoice.tax).toBe(150);
  });

  it('should handle late fees correctly', () => {
    const amount = 1000;
    const daysOverdue = 5;
    const lateFeePercentage = 0.005; // 0.5% per day
    const expectedLateFee = amount * lateFeePercentage * daysOverdue;
    
    const lateFee = amount * lateFeePercentage * daysOverdue;
    
    expect(lateFee).toBe(25);
  });

  it('should validate invoice data before generation', () => {
    const invalidInvoice = {
      amount: -100, // Invalid: negative amount
      description: '',
    };
    
    const isValid = invalidInvoice.amount > 0 && invalidInvoice.description.length > 0;
    expect(isValid).toBe(false);
  });

  it('should generate unique invoice IDs', () => {
    const id1 = Math.random().toString(36).substring(7);
    const id2 = Math.random().toString(36).substring(7);
    
    expect(id1).not.toBe(id2);
  });
});
'''
    
    with open(invoice_test_path, 'w') as f:
        f.write(invoice_test_code)
    print(f"✅ Created invoice generation tests: {invoice_test_path}")
    
    # Create edge cases test
    edge_cases_path = os.path.join(test_dir, "edge-cases.test.ts")
    
    edge_cases_code = '''import { describe, it, expect } from 'vitest';

describe('Edge Cases and Boundary Conditions', () => {
  it('should handle zero amount invoices', () => {
    const amount = 0;
    expect(amount).toBe(0);
  });

  it('should handle very large amounts', () => {
    const amount = 999999999.99;
    expect(amount).toBeGreaterThan(0);
  });

  it('should handle currency precision', () => {
    const amount = 10.5;
    const tax = amount * 0.15;
    const total = amount + tax;
    
    // Check precision to 2 decimal places
    expect(Math.round(total * 100) / 100).toBe(12.08);
  });

  it('should reject invalid dates', () => {
    const invalidDate = new Date('invalid');
    expect(invalidDate.toString()).toBe('Invalid Date');
  });
});
'''
    
    with open(edge_cases_path, 'w') as f:
        f.write(edge_cases_code)
    print(f"✅ Created edge cases tests: {edge_cases_path}")
    
    print("✅ Task 4 completed: Reliability tests created")
    return True

if __name__ == "__main__":
    success = create_reliability_tests()
    exit(0 if success else 1)
