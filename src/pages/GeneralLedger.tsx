
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
// FIX: Import Account type for explicit type annotation
import { JournalEntry, Account } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, normalizeArabicNumerals } from '../utils/helpers';
import { Calculator, PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const GeneralLedger: React.FC = () => {
    // FIX: Use financeService for financial operations
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const journalEntries = useMemo(() => [...(db.journalEntries || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [db.journalEntries]);
    const accounts = db.accounts || [];
    // FIX: Add explicit type to Map to help TypeScript inference
    const accountsMap = useMemo(() => new Map<string, Account>(accounts?.map(a => [a.id, a])), [accounts]);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><Calculator /> دفتر الأستاذ العام (قيود اليومية)</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary flex items-center gap-2">
                    <PlusCircle size={16} /> إضافة قيد يدوي
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="text-xs uppercase bg-background text-text">
                        <tr>
                            <th scope="col" className="px-6 py-3 border border-border">التاريخ</th>
                            <th scope="col" className="px-6 py-3 border border-border">رقم القيد</th>
                            <th scope="col" className="px-6 py-3 border border-border">الحساب</th>
                            <th scope="col" className="px-6 py-3 border border-border">مدين</th>
                            <th scope="col" className="px-6 py-3 border border-border">دائن</th>
                            <th scope="col" className="px-6 py-3 border border-border">المصدر</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(journalEntries || []).map(je => (
                            <tr key={je.id} className="bg-card hover:bg-background">
                                <td className="px-6 py-4 border border-border">{formatDate(je.date)}</td>
                                <td className="px-6 py-4 font-mono border border-border">{je.no}</td>
                                <td className="px-6 py-4 border border-border">{accountsMap.get(je.accountId)?.name || je.accountId}</td>
                                <td className="px-6 py-4 font-mono text-green-600 border border-border">{je.type === 'DEBIT' ? formatCurrency(je.amount) : '-'}</td>
                                <td className="px-6 py-4 font-mono text-red-600 border border-border">{je.type === 'CREDIT' ? formatCurrency(je.amount) : '-'}</td>
                                <td className="px-6 py-4 text-xs font-mono border border-border" title={je.sourceId}>{je.sourceId.slice(0, 15)}...</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <ManualJournalVoucherForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={financeService.addManualJournalVoucher} />}
        </Card>
    );
};

interface Line {
    accountId: string;
    debit: number;
    credit: number;
}

const ManualJournalVoucherForm: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (data: any) => Promise<void> }> = ({ isOpen, onClose, onSubmit }) => {
    const { db } = useApp();
    const accounts = db.accounts || [];
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<Line[]>([
        { accountId: '', debit: 0, credit: 0 },
        { accountId: '', debit: 0, credit: 0 },
    ]);

    const handleLineChange = (index: number, field: keyof Line, value: string | number) => {
        const newLines = [...lines];
        (newLines[index] as any)[field] = value;
        setLines(newLines);
    };

    const addLine = () => setLines([...lines, { accountId: '', debit: 0, credit: 0 }]);
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

    const totals = useMemo(() => {
        return lines.reduce((acc, line) => {
            acc.debit += Number(line.debit) || 0;
            acc.credit += Number(line.credit) || 0;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [lines]);

    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.001 && totals.debit > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            toast.error("القيد غير متوازن أو فارغ.");
            return;
        }
        await onSubmit({ date, notes, lines: lines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0)) });
        onClose();
    };
    
    if (!accounts) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="قيد يومية يدوي">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات القيد" required />
                </div>
                
                <div className="space-y-2">
                    {lines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <select className="col-span-6" value={line.accountId} onChange={e => handleLineChange(index, 'accountId', e.target.value)} required>
                                <option value="">-- اختر الحساب --</option>
                                {accounts.filter(a => !a.isParent).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.no})</option>)}
                            </select>
                            <input className="col-span-2" type="number" value={line.debit || ''} onChange={e => handleLineChange(index, 'debit', parseFloat(normalizeArabicNumerals(e.target.value)))} />
                            <input className="col-span-2" type="number" value={line.credit || ''} onChange={e => handleLineChange(index, 'credit', parseFloat(normalizeArabicNumerals(e.target.value)))} />
                            <div className="col-span-2 flex justify-end">
                                <button type="button" onClick={addLine} className="btn btn-ghost">+</button>
                                {lines.length > 2 && <button type="button" onClick={() => removeLine(index)} className="btn btn-ghost text-red-500">-</button>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-12 gap-2 pt-2 border-t font-bold">
                    <div className="col-span-6 text-left">الإجمالي</div>
                    <div className="col-span-2">{formatCurrency(totals.debit)}</div>
                    <div className="col-span-2">{formatCurrency(totals.credit)}</div>
                </div>
                {!isBalanced && <p className="text-red-500 text-xs text-center">القيد غير متوازن. يجب أن يتساوى مجموع المدين مع مجموع الدائن.</p>}
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={!isBalanced}>حفظ القيد</button>
                </div>
            </form>
        </Modal>
    );
};

export default GeneralLedger;