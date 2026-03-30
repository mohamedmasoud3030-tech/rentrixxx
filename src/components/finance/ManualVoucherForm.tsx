import React, { useMemo, useState } from 'react';
import { PlusCircle, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../../contexts/AppContext';
import NumberInput from '../ui/NumberInput';

interface VoucherLine {
  accountId: string;
  debit: number;
  credit: number;
  query?: string;
}

interface ManualVoucherFormProps {
  onSubmit: (payload: { date: string; notes: string; lines: VoucherLine[] }) => Promise<void>;
  onCancel?: () => void;
  compact?: boolean;
}

const round3 = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 1000) / 1000;

const ManualVoucherForm: React.FC<ManualVoucherFormProps> = ({ onSubmit, onCancel, compact = false }) => {
  const { db } = useApp();
  const accounts = (db.accounts || []).filter((acc) => !acc.isParent);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<VoucherLine[]>([
    { accountId: '', debit: 0, credit: 0, query: '' },
    { accountId: '', debit: 0, credit: 0, query: '' },
  ]);

  const setLine = (index: number, updates: Partial<VoucherLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...updates } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { accountId: '', debit: 0, credit: 0, query: '' }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const accountSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts.slice(0, 20);
    return accounts
      .filter((acc) => acc.name.toLowerCase().includes(q) || acc.no.toLowerCase().includes(q))
      .slice(0, 20);
  };

  const postedLines = useMemo(
    () =>
      lines
        .map((line) => ({
          accountId: line.accountId,
          debit: round3(Math.max(0, Number(line.debit) || 0)),
          credit: round3(Math.max(0, Number(line.credit) || 0)),
        }))
        .filter((line) => line.accountId || line.debit > 0 || line.credit > 0),
    [lines],
  );

  const totalDebits = round3(postedLines.reduce((s, l) => s + l.debit, 0));
  const totalCredits = round3(postedLines.reduce((s, l) => s + l.credit, 0));

  const hasInvalidLines = postedLines.some(
    (line) => !line.accountId || (line.debit > 0 && line.credit > 0) || (line.debit <= 0 && line.credit <= 0),
  );
  const isBalanced = postedLines.length >= 2 && !hasInvalidLines && Math.abs(totalDebits - totalCredits) < 0.001;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInvalidLines) {
      toast.error('تأكد من اختيار الحساب وتعبئة مدين أو دائن فقط لكل سطر.');
      return;
    }
    if (!isBalanced) {
      toast.error('القيد غير متوازن.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ date, notes, lines: postedLines });
      setLines([
        { accountId: '', debit: 0, credit: 0, query: '' },
        { accountId: '', debit: 0, credit: 0, query: '' },
      ]);
      setNotes('');
      if (compact && onCancel) onCancel();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={`space-y-4 ${compact ? '' : 'max-w-6xl'}`} dir="rtl">
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-3`}>
        <div>
          <label className="text-xs font-bold text-text-muted">تاريخ القيد</label>
          <input type="date" className="w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-bold text-text-muted">الوصف</label>
          <input value={notes} className="w-full" onChange={(e) => setNotes(e.target.value)} placeholder="وصف القيد" />
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-background/70 text-text-muted text-xs">
            <tr>
              <th className="px-3 py-3 text-right">الحساب</th>
              <th className="px-3 py-3 text-right">مدين (Debit)</th>
              <th className="px-3 py-3 text-right">دائن (Credit)</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lines.map((line, i) => {
              const suggestions = accountSearch(line.query || '');
              return (
                <tr key={i}>
                  <td className="px-3 py-2 align-top min-w-[280px]">
                    <input
                      className="w-full mb-1"
                      placeholder="ابحث باسم أو رقم الحساب"
                      value={line.query ?? ''}
                      onChange={(e) => setLine(i, { query: e.target.value })}
                    />
                    <select
                      className="w-full"
                      value={line.accountId}
                      onChange={(e) => {
                        const selected = accounts.find((acc) => acc.id === e.target.value);
                        setLine(i, { accountId: e.target.value, query: selected ? `${selected.no} - ${selected.name}` : '' });
                      }}
                      required
                    >
                      <option value="">— اختر الحساب —</option>
                      {suggestions.map((acc) => (
                        <option key={acc.id} value={acc.id}>{`${acc.no} - ${acc.name}`}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <NumberInput
                      value={line.debit || ''}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLine();
                        }
                      }}
                      onChange={(value) =>
                        setLine(i, {
                          debit: round3(Math.max(0, value || 0)),
                          credit: value > 0 ? 0 : round3(line.credit || 0),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumberInput
                      value={line.credit || ''}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLine();
                        }
                      }}
                      onChange={(value) =>
                        setLine(i, {
                          credit: round3(Math.max(0, value || 0)),
                          debit: value > 0 ? 0 : round3(line.debit || 0),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {lines.length > 2 ? (
                      <button type="button" className="p-2 rounded hover:bg-rose-50 text-rose-600" onClick={() => removeLine(i)}>
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-background/50">
            <tr>
              <td className="px-3 py-3 font-bold">الإجمالي</td>
              <td className="px-3 py-3 font-mono" dir="ltr">{totalDebits.toFixed(3)}</td>
              <td className="px-3 py-3 font-mono" dir="ltr">{totalCredits.toFixed(3)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={addLine} className="btn btn-ghost flex items-center gap-2">
          <PlusCircle size={16} /> إضافة سطر
        </button>

        <div className="flex items-center gap-3">
          <div className={`text-xs font-bold flex items-center gap-1 ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isBalanced ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {isBalanced ? 'القيد متوازن' : 'القيد غير متوازن'}
          </div>
          {!!onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!isBalanced || loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ القيد'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ManualVoucherForm;
