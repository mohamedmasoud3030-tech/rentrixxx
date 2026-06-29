import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase5FinancialsHubPage } from './phase5-financials-hub';
import { Phase5InvoicesHubPage, validatePhase5InvoiceForm } from './phase5-invoices-hub';
import { Phase5ReceiptsHubPage, validatePhase5PaymentForm } from './phase5-receipts-hub';
import { Phase5ExpensesHubPage, validatePhase5ExpenseForm } from './phase5-expenses-hub';
import { calculateOfficeProfitability, calculateOwnerSettlement } from '@/domain/financial-settlements';
import { FinancialsRouteComponent } from '@/routes/_protected.financials';
import { InvoicesRouteComponent } from '@/routes/_protected.invoices';
import { ReceiptsRouteComponent } from '@/routes/_protected.receipts';
import { ExpensesRouteComponent } from '@/routes/_protected.expenses';

describe('Phase 5 financial workflows and settlements engine', () => {
  it('calculates owner settlement correctly for property management agreements', () => {
    const agreement = {
      id: 'agr-1',
      ownerId: 'owner-1',
      propertyId: 'prop-1',
      agreementType: 'property_management' as const,
      startDate: '2026-01-01',
      status: 'active' as const,
      commissionRate: 10, // 10%
      fixedFee: 500,
      isArchived: false,
      createdAt: '2026-01-01',
    };
    const receipts = [
      { id: 'rec-1', invoiceId: 'inv-1', amount: 10000, paymentDate: '2026-02-01', paymentMethod: 'cash' as const, createdAt: '2026-02-01' },
    ];
    const expenses = [
      { id: 'exp-1', propertyId: 'prop-1', amount: 1200, expenseDate: '2026-02-01', description: 'صيانة', responsibility: 'owner' as const, isArchived: false, createdAt: '2026-02-01' },
    ];

    const result = calculateOwnerSettlement(agreement, receipts, expenses);

    expect(result.grossRevenue).toBe(10000);
    // feesDeducted = 10000 * 0.10 + 500 = 1500
    expect(result.feesDeducted).toBe(1500);
    expect(result.expensesDeducted).toBe(1200);
    // netPayout = 10000 - 1500 - 1200 = 7300
    expect(result.netPayout).toBe(7300);
  });

  it('calculates owner settlement correctly for master lease agreements', () => {
    const agreement = {
      id: 'agr-2',
      ownerId: 'owner-2',
      propertyId: 'prop-2',
      agreementType: 'master_lease' as const,
      startDate: '2026-01-01',
      status: 'active' as const,
      fixedFee: 50000, // fixed master lease annual obligation
      isArchived: false,
      createdAt: '2026-01-01',
    };

    const result = calculateOwnerSettlement(agreement, [], []);

    expect(result.grossRevenue).toBe(50000);
    expect(result.feesDeducted).toBe(0);
    expect(result.netPayout).toBe(50000);
  });

  it('validates Phase 5 forms accurately', () => {
    expect(validatePhase5InvoiceForm({ contractId: '', amount: '1000', dueDate: '2026-01-01' })).toBe('يجب اختيار العقد.');
    expect(validatePhase5InvoiceForm({ contractId: 'c-1', amount: '-50', dueDate: '2026-01-01' })).toBe('قيمة المطالبة يجب أن تكون رقماً موجباً.');

    expect(validatePhase5PaymentForm({ invoiceId: 'inv-1', amount: '2000', paymentDate: '2026-01-01', paymentMethod: 'cash', referenceNumber: '' }, 1500)).toBe('قيمة الدفعة تتجاوز المبلغ المتبقي على الفاتورة.');

    expect(validatePhase5ExpenseForm({ propertyId: '', unitId: '', amount: '500', expenseDate: '2026-01-01', description: 'صيانة', responsibility: 'owner' })).toBe('يجب تحديد العقار.');
  });

  it('renders all Phase 5 Arabic hubs cleanly from local mock data', () => {
    const htmlFin = renderToStaticMarkup(<Phase5FinancialsHubPage />);
    expect(htmlFin).toContain('مركز الإدارة المالية الشاملة');
    expect(htmlFin).toContain('حاسبة تسويات الملاك');

    const htmlInv = renderToStaticMarkup(<Phase5InvoicesHubPage />);
    expect(htmlInv).toContain('مركز الفواتير');

    const htmlRec = renderToStaticMarkup(<Phase5ReceiptsHubPage />);
    expect(htmlRec).toContain('مركز التحصيلات وسندات القبض');

    const htmlExp = renderToStaticMarkup(<Phase5ExpensesHubPage />);
    expect(htmlExp).toContain('مركز المصروفات');
  });

  it('wires Phase 5 hubs into protected financial routes', () => {
    expect(FinancialsRouteComponent).toBe(Phase5FinancialsHubPage);
    expect(InvoicesRouteComponent).toBe(Phase5InvoicesHubPage);
    expect(ReceiptsRouteComponent).toBe(Phase5ReceiptsHubPage);
    expect(ExpensesRouteComponent).toBe(Phase5ExpensesHubPage);
  });
});
