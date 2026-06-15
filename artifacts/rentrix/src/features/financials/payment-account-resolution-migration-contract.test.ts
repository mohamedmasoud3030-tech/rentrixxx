import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../../supabase/migrations/20260615000100_fix_invoice_payment_account_resolution.sql', import.meta.url),
  'utf8',
);

describe('payment account resolution repair migration', () => {
  it('keeps account resolution text-based and avoids the previous uuid cast regression', () => {
    expect(migration).toContain('RETURNS text');
    expect(migration).toContain('v_matched_account_id text');
    expect(migration).toContain("WHEN 'cash' THEN");
    expect(migration).toContain("v_target_no := '1111'");
    expect(migration).toContain("WHEN 'receivable' THEN");
    expect(migration).toContain("v_target_no := '1201'");
    expect(migration).toContain('min(id::text)');
    expect(migration).not.toMatch(/id::uuid/i);
  });

  it('preserves the browser-facing payment RPC while keeping helper access internal', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.record_invoice_payment_atomic(payload jsonb)');
    expect(migration).toContain("v_debit_account_id := public.find_payment_account_id('cash')");
    expect(migration).toContain("v_credit_account_id := public.find_payment_account_id('receivable')");
    expect(migration).toContain("'payment_id', v_payment_id");
    expect(migration).toContain("'receipt_id', coalesce(nullif(v_internal_result->>'receipt_id', '')::uuid, v_receipt_id)");
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.find_payment_account_id(text) FROM public, anon, authenticated');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.record_invoice_payment_atomic(jsonb) TO authenticated');
  });

  it('documents the required post-apply live verification query targets', () => {
    expect(migration).toContain("public.find_payment_account_id('cash')");
    expect(migration).toContain("public.find_payment_account_id('receivable')");
    expect(migration).toContain("VALUES ('record_invoice_payment_atomic', v_request_id, v_result)");
  });
});
