import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';
import { AlertTriangle, ArrowRight, BarChart3, FileCheck2, FileWarning, Link2, Receipt, ScrollText } from 'lucide-react';
import { getArrearsAmount } from '@/services/financialFlowService';

const currentMonth = (): string => new Date().toISOString().slice(0, 7);

const FinanceIntelligenceHub: React.FC = () => {
  const { db } = useApp();

  const intelligence = useMemo(() => {
    const month = currentMonth();
    const monthInvoices = (db.invoices || []).filter(inv => inv.dueDate.slice(0, 7) === month);
    const activeContracts = (db.contracts || []).filter(contract => contract.status === 'ACTIVE');

    const invoicesByContract = new Map<string, number>();
    monthInvoices.forEach(invoice => {
      invoicesByContract.set(invoice.contractId, (invoicesByContract.get(invoice.contractId) || 0) + 1);
    });

    const contractsMissingInvoices = activeContracts.filter(contract => !invoicesByContract.has(contract.id));
    const overdueInvoices = (db.invoices || []).filter(invoice => invoice.status === 'OVERDUE');
    const overdueAmount = getArrearsAmount(overdueInvoices);

    const allocationsByReceipt = new Map<string, number>();
    (db.receiptAllocations || []).forEach(allocation => {
      allocationsByReceipt.set(allocation.receiptId, (allocationsByReceipt.get(allocation.receiptId) || 0) + allocation.amount);
    });

    const unallocatedReceipts = (db.receipts || []).filter(receipt => {
      if (receipt.status !== 'POSTED') return false;
      const allocated = allocationsByReceipt.get(receipt.id) || 0;
      return receipt.amount - allocated > 0.001;
    });

    const contractsWithOpenInvoices = new Set(
      (db.invoices || [])
        .filter(invoice => invoice.status !== 'PAID')
        .map(invoice => invoice.contractId),
    );

    const connectedContracts = (activeContracts || []).filter(contract => contractsWithOpenInvoices.has(contract.id)).length;

    return {
      month,
      totalActiveContracts: activeContracts.length,
      contractsMissingInvoices,
      overdueInvoicesCount: overdueInvoices.length,
      overdueAmount,
      unallocatedReceipts,
      connectedContracts,
    };
  }, [db]);

  const insightCards = [
    {
      title: 'عقود بلا فواتير شهرية',
      value: intelligence.contractsMissingInvoices.length.toString(),
      subtitle: `من أصل ${intelligence.totalActiveContracts} عقد نشط`,
      tone: 'text-amber-700 bg-amber-50 border-amber-100',
      icon: <FileWarning size={18} />,
      href: '/financial/invoices',
      cta: 'استكمال إصدار فواتير العقود',
    },
    {
      title: 'فواتير متأخرة',
      value: `${intelligence.overdueInvoicesCount}`,
      subtitle: `إجمالي متأخرات ${formatCurrency(intelligence.overdueAmount)}`,
      tone: 'text-rose-700 bg-rose-50 border-rose-100',
      icon: <AlertTriangle size={18} />,
      href: '/financial/invoices',
      cta: 'متابعة التحصيل والتحويل لسندات قبض',
    },
    {
      title: 'سندات غير مربوطة',
      value: `${intelligence.unallocatedReceipts.length}`,
      subtitle: 'تحتاج توزيع على فواتير العقود المفتوحة',
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
      icon: <Receipt size={18} />,
      href: '/financial/receipts',
      cta: 'مراجعة السندات وتخصيصها',
    },
    {
      title: 'العقود المرتبطة ماليًا',
      value: `${intelligence.connectedContracts}`,
      subtitle: 'عقود لها فواتير غير مسددة أو جزئية',
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      icon: <Link2 size={18} />,
      href: '/financial/accounting',
      cta: 'مراجعة القيود والحركات المرتبطة',
    },
  ];

  return (
    <Card className="p-5 border-none shadow-lg bg-card/70 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-black text-primary uppercase tracking-[0.18em]">Finance Intelligence Layer</p>
          <h2 className="text-xl font-black mt-1">ربط ذكي بين العقود والفواتير والسندات والتقارير</h2>
          <p className="text-sm text-text-muted mt-1">قراءة شهر {intelligence.month} لالتقاط الفجوات التشغيلية قبل ترحيلها للتقارير.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/financial/invoices" className="btn btn-secondary text-xs font-black flex items-center gap-2">
            <ScrollText size={14} /> سير الفواتير
          </Link>
          <Link to="/reports" className="btn btn-primary text-xs font-black flex items-center gap-2">
            <BarChart3 size={14} /> فتح التقارير المرتبطة
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {insightCards.map(card => (
          <div key={card.title} className={`rounded-2xl border p-4 ${card.tone}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex p-2 rounded-xl bg-white/70">{card.icon}</span>
              <p className="text-2xl font-black" dir="ltr">{card.value}</p>
            </div>
            <p className="text-sm font-black">{card.title}</p>
            <p className="text-xs mt-1 opacity-80">{card.subtitle}</p>
            <Link to={card.href} className="mt-3 text-xs font-black inline-flex items-center gap-1 hover:underline">
              {card.cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border p-3 bg-background/40 flex items-start gap-2 text-xs text-text-muted">
        <FileCheck2 size={14} className="text-emerald-600 mt-0.5" />
        <p>
          تم بناء المؤشرات مباشرة من العقود + الفواتير + سندات القبض + تخصيص السندات؛ وبالتالي أي تعديل في هذه الأقسام ينعكس فورًا في رؤية الإدارة المالية.
        </p>
      </div>
    </Card>
  );
};

export default FinanceIntelligenceHub;
