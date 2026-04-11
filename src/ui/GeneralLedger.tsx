import React, { useMemo, useState } from 'react';
import { Calculator, PlusCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ManualVoucherForm from '../components/finance/ManualVoucherForm';
import { formatCurrency, formatDate } from '../utils/helpers';
import { calculateGeneralLedgerForAccount } from '../services/accountingService';

const PAGE_SIZE = 50;

const GeneralLedger: React.FC = () => {
  const { db, financeService } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);

  const accounts = (db.accounts || []).filter((acc) => !acc.isParent);

  const rows = useMemo(() => {
    if (!accountId) return [];
    return calculateGeneralLedgerForAccount(db, accountId, startDate, endDate);
  }, [db, accountId, startDate, endDate]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sourceLabel = (sourceId?: string) => {
    if (!sourceId) return '—';
    const foundReceipt = db.receipts.find((r) => r.id === sourceId || r.no === sourceId);
    if (foundReceipt) return `سند قبض ${foundReceipt.no}`;
    const foundExpense = db.expenses.find((e) => e.id === sourceId || e.no === sourceId);
    if (foundExpense) return `مصروف ${foundExpense.no}`;
    const foundInvoice = db.invoices.find((i) => i.id === sourceId || i.no === sourceId);
    if (foundInvoice) return `فاتورة ${foundInvoice.no}`;
    return sourceId;
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-black flex items-center gap-2"><Calculator size={20} /> دفتر الأستاذ العام</h2>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <PlusCircle size={16} /> قيد يدوي
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs font-bold text-text-muted">الحساب</label>
            <select
              className="w-full"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">— اختر حسابًا —</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{`${acc.no} - ${acc.name}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-text-muted">من تاريخ</label>
            <input type="date" className="w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-muted">إلى تاريخ</label>
            <input type="date" className="w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <div className="text-xs text-text-muted">عدد القيود: <span className="font-black" dir="ltr">{rows.length}</span></div>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-background text-text-muted text-xs">
              <tr>
                <th className="px-3 py-3 text-right">التاريخ</th>
                <th className="px-3 py-3 text-right">رقم القيد</th>
                <th className="px-3 py-3 text-right">مدين (Debit)</th>
                <th className="px-3 py-3 text-right">دائن (Credit)</th>
                <th className="px-3 py-3 text-right">رصيد متراكم</th>
                <th className="px-3 py-3 text-right">المصدر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!accountId ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted">اختر حسابًا لعرض دفتر الأستاذ.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted">لا توجد قيود ضمن هذا النطاق.</td></tr>
              ) : currentRows.map((line) => (
                <tr key={line.id}>
                  <td className="px-3 py-3">{formatDate(line.date)}</td>
                  <td className="px-3 py-3 font-black text-primary">{line.no}</td>
                  <td className="px-3 py-3 font-mono text-blue-700" dir="ltr">{line.debit ? formatCurrency(line.debit) : '-'}</td>
                  <td className="px-3 py-3 font-mono text-emerald-700" dir="ltr">{line.credit ? formatCurrency(line.credit) : '-'}</td>
                  <td className="px-3 py-3 font-mono" dir="ltr">{formatCurrency(line.runningBalance)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">{sourceLabel(line.sourceId)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>السابق</button>
            <p className="text-xs text-text-muted">صفحة <span dir="ltr">{page} / {pageCount}</span></p>
            <button className="btn btn-ghost" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>التالي</button>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="قيد يومية يدوي">
        <ManualVoucherForm
          compact
          onCancel={() => setIsModalOpen(false)}
          onSubmit={async (payload) => {
            await financeService.addManualJournalVoucher(payload);
            setIsModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default GeneralLedger;
