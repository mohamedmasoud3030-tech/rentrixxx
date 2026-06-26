import { describe, expect, it } from 'vitest';
import type { AuthorizationContext } from '@/features/auth/permissions';
import { canVoidReceipts, createReceiptPrintHref } from './receipts-page';

function authorization(role: AuthorizationContext['role']): AuthorizationContext {
  return {
    userId: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.test`,
    role,
  };
}

describe('receipts page action helpers', () => {
  it('allows only admins and managers to void receipts', () => {
    expect(canVoidReceipts(authorization('ADMIN'))).toBe(true);
    expect(canVoidReceipts(authorization('MANAGER'))).toBe(true);
    expect(canVoidReceipts(authorization('USER'))).toBe(false);
    expect(canVoidReceipts(null)).toBe(false);
  });

  it('creates merged receipt print links with encoded receipt ids', () => {
    expect(createReceiptPrintHref('receipt id/42')).toBe('/receipts?receiptId=receipt%20id%2F42');
  });
});
