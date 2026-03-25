
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Receipt, Expense, DepositTx, OwnerSettlement, Tenant } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, VoidAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, formatDateTime, getStatusBadgeClass, formatDate, exportToCsv, RECEIPT_STATUS_AR, CHANNEL_AR, EXPENSE_STATUS_AR } from '../utils/helpers';
import HardGateBanner from '../components/shared/HardGateBanner';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { Receipt as ReceiptIcon, CreditCard, Landmark, PiggyBank, MessageCircle, Download } from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { ReceiptPrint } from '../components/print/PrintTemplate';
import { toast } from 'react-hot-toast';

const ExpensePrintable: React.FC<{ expense: Expense }> = ({ expense }) => {
    const { db } = useApp();
    // FIX: Corrected path to company settings
    const company = db.settings.general.company;
    const expensePurpose = `${expense.category}: ${expense.notes || expense.ref}`;
    return (
        <div className="w-full flex flex-col font-['Cairo']" dir="rtl">
            <header className="flex justify-between items-start pb-4 border-b-2 border-border">
                <div className="text-right">
                    <h1 className="text-2xl font-bold">{company.name}</h1>
                    <p className="text-sm">{company.address}</p>
                    <p className="text-sm">هاتف: {company.phone}</p>
                </div>
                <div className="text-left">
                    <h2 className="text-3xl font-bold text-red-600">سند صرف</h2>
                    <p className="mt-2">رقم السند: <span className="font-mono">{expense.no}</span></p>
                    <p>التاريخ: <span className="font-mono">{formatDateTime(expense.dateTime)}</span></p>
                </div>
            </header>
            <main className="mt-8 text-lg flex-grow">
                <div className="flex items-center mb-5"><span className="w-48 font-bold">صرف إلى السيد/ة:</span><span>{expense.payee || expense.ref || 'غير محدد'}</span></div>
                {/* FIX: Corrected path to currency settings */}
                <div className="flex items-center mb-5"><span className="w-48 font-bold">مبلغاً وقدره:</span><span className="font-bold text-xl px-4 py-2 border-2 border-border rounded-md bg-background">{formatCurrency(expense.amount, db.settings.operational.currency)}</span></div>
                <div className="flex items-start mb-5"><span className="w-48 font-bold">وذلك عن:</span><span className="flex-1">{expensePurpose}</span></div>
            </main>
            <footer className="mt-8 pt-8 flex justify-around text-center">
                <div><p className="font-bold">توقيع المحاسب</p><p className="mt-12">.........................</p></div>
                <div><p className="font-bold">توقيع المستلم</p><p className="mt-12">.........................</p></div>
            </footer>
        </div>
    );
};

const Financials: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'receipts' | 'expenses' | 'deposits' | 'settlements'>('receipts');
    return (
        <div className="space-y-6">
            <HardGateBanner />
            <Card>
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        <button onClick={() => setActiveTab('receipts')} className={`${activeTab === 'receipts' ? 'border-primary text-primary' : 'border-transparent text-text-muted'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>سندات القبض</button>
                        <button onClick={() => setActiveTab('expenses')} className={`${activeTab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-text-muted'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>المصروفات</button>
                        <button onClick={() => setActiveTab('deposits')} className={`${activeTab === 'deposits' ? 'border-primary text-primary' : 'border-transparent text-text-muted'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>الودائع</button>
                        <button onClick={() => setActiveTab('settlements')} className={`${activeTab === 'settlements' ? 'border-primary text-primary' : 'border-transparent text-text-muted'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>تسويات الملاك</button>
                    </nav>
                </div>
                <div className="pt-6">
                    {activeTab === 'receipts' && <ReceiptsView />}
                    {activeTab === 'expenses' && <ExpensesView />}
                    {activeTab === 'deposits' && <DepositsView />}
                    {activeTab === 'settlements' && <OwnerSettlementsView />}
                </div>
            </Card>
        </div>
    );
};

const ReceiptsView: React.FC = () => {
    // FIX: Use financeService for financial operations
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);

    const filteredReceipts = useMemo(() => {
        return db.receipts.filter(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return r.no.includes(searchTerm) || tenant?.name.includes(searchTerm);
        }).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.receipts, db.contracts, db.tenants, searchTerm]);

    const receiptDataForPrint = useMemo(() => {
        if (!printingReceipt) return null;
        const contract = db.contracts.find(c => c.id === printingReceipt.contractId);
        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
        const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
        return {
            no: printingReceipt.no,
            date: formatDateTime(printingReceipt.dateTime),
            tenantName: tenant?.name || 'غير معروف',
            // FIX: Corrected path to currency settings
            amount: formatCurrency(printingReceipt.amount, db.settings.operational.currency),
            description: printingReceipt.notes || `دفعة إيجار للوحدة ${unit?.name || ''}`
        };
    }, [printingReceipt, db]);

    const handleExportReceiptsCsv = () => {
        const rows = filteredReceipts.map(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return {
                'رقم السند': r.no,
                'التاريخ': formatDateTime(r.dateTime),
                'المستأجر': tenant?.name || '',
                'المبلغ': r.amount,
                'طريقة الدفع': CHANNEL_AR[r.channel as keyof typeof CHANNEL_AR] || r.channel,
                'الحالة': RECEIPT_STATUS_AR[r.status as keyof typeof RECEIPT_STATUS_AR] || r.status,
                'ملاحظات': r.notes || '',
            };
        });
        exportToCsv('سندات_قبض_rentrix', rows);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة سندات القبض</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportReceiptsCsv} className="btn btn-secondary flex items-center gap-1">
                        <Download size={14} />
                        تصدير CSV
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">إضافة سند قبض</button>
                </div>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="بحث برقم السند أو اسم المستأجر..." />
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">رقم السند</th>
                            <th className="px-6 py-3 border border-border">التاريخ</th>
                            <th className="px-6 py-3 border border-border">المستأجر</th>
                            <th className="px-6 py-3 border border-border">المبلغ</th>
                            <th className="px-6 py-3 border border-border">طريقة الدفع</th>
                            <th className="px-6 py-3 border border-border">الحالة</th>
                            <th className="px-6 py-3 border border-border">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReceipts.map(r => {
                            const contract = db.contracts.find(c => c.id === r.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            return (
                                <tr key={r.id} className="bg-card hover:bg-background transition-colors">
                                    <td className="px-6 py-4 font-mono border border-border">{r.no}</td>
                                    <td className="px-6 py-4 border border-border">{formatDateTime(r.dateTime)}</td>
                                    <td className="px-6 py-4 border border-border">{tenant?.name || '-'}</td>
                                    <td className="px-6 py-4 font-bold border border-border">{formatCurrency(r.amount, db.settings.operational.currency)}</td>
                                    <td className="px-6 py-4 border border-border">
                                        <span className="text-xs">{CHANNEL_AR[r.channel as keyof typeof CHANNEL_AR] || r.channel}</span>
                                        {r.channel === 'CHECK' && r.checkNumber && (
                                            <div className="text-[10px] text-text-muted mt-0.5">
                                                شيك #{r.checkNumber} {r.checkBank && `- ${r.checkBank}`}
                                                {r.checkStatus && <span className={`mr-1 px-1 py-0.5 rounded ${r.checkStatus === 'CLEARED' ? 'bg-green-100 text-green-700' : r.checkStatus === 'BOUNCED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{CHECK_STATUS_AR[r.checkStatus]}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 border border-border"><span className={`status-badge ${r.status === 'POSTED' ? 'status-success' : 'status-danger'}`}>{RECEIPT_STATUS_AR[r.status as keyof typeof RECEIPT_STATUS_AR] || r.status}</span></td>
                                    <td className="px-6 py-4 border border-border">
                                        <ActionsMenu items={[
                                            EditAction(() => { setEditingReceipt(r); setIsModalOpen(true); }),
                                            PrintAction(() => setPrintingReceipt(r)),
                                            { label: 'إرسال واتساب', icon: <MessageCircle size={16} />, onClick: () => setWhatsAppContext({ recipient: tenant, type: 'receipt', data: { receipt: r } }) },
                                            // FIX: Use financeService for financial operations
                                            VoidAction(() => financeService.voidReceipt(r.id))
                                        ]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ReceiptForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingReceipt(null); }} receipt={editingReceipt} />}
            {printingReceipt && receiptDataForPrint && (
                <PrintPreviewModal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="طباعة سند قبض">
                    <ReceiptPrint data={receiptDataForPrint} settings={db.settings} />
                </PrintPreviewModal>
            )}
            {whatsAppContext && <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />}
        </div>
    );
};

const ExpensesView: React.FC = () => {
    // FIX: Use financeService for financial operations
    const { db, financeService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [printingExpense, setPrintingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExpenses = useMemo(() => {
        return db.expenses.filter(e => e.no.includes(searchTerm) || e.category.includes(searchTerm) || e.notes.includes(searchTerm))
                         .sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.expenses, searchTerm]);

    const handleExportExpensesCsv = () => {
        const rows = filteredExpenses.map(e => ({
            'رقم السند': e.no,
            'التاريخ': formatDateTime(e.dateTime),
            'التصنيف': e.category,
            'المبلغ': e.amount,
            'الحالة': EXPENSE_STATUS_AR[e.status as keyof typeof EXPENSE_STATUS_AR] || e.status,
            'ملاحظات': e.notes || '',
        }));
        exportToCsv('مصروفات_rentrix', rows);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة المصروفات</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportExpensesCsv} className="btn btn-secondary flex items-center gap-1">
                        <Download size={14} />
                        تصدير CSV
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">إضافة مصروف</button>
                </div>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="بحث بالمصروف..." />
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">رقم السند</th>
                            <th className="px-6 py-3 border border-border">التاريخ</th>
                            <th className="px-6 py-3 border border-border">التصنيف</th>
                            <th className="px-6 py-3 border border-border">المبلغ</th>
                            <th className="px-6 py-3 border border-border">الحالة</th>
                            <th className="px-6 py-3 border border-border">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map(e => (
                            <tr key={e.id} className="bg-card hover:bg-background transition-colors">
                                <td className="px-6 py-4 font-mono border border-border">{e.no}</td>
                                <td className="px-6 py-4 border border-border">{formatDateTime(e.dateTime)}</td>
                                <td className="px-6 py-4 border border-border">{e.category}</td>
                                {/* FIX: Corrected path to currency settings */}
                                <td className="px-6 py-4 font-bold border border-border">{formatCurrency(e.amount, db.settings.operational.currency)}</td>
                                <td className="px-6 py-4 border border-border"><span className={`status-badge ${e.status === 'POSTED' ? 'status-info' : 'status-danger'}`}>{EXPENSE_STATUS_AR[e.status as keyof typeof EXPENSE_STATUS_AR] || e.status}</span></td>
                                <td className="px-6 py-4 border border-border">
                                    <ActionsMenu items={[
                                        EditAction(() => { setEditingExpense(e); setIsModalOpen(true); }),
                                        PrintAction(() => setPrintingExpense(e)),
                                        // FIX: Use financeService for financial operations
                                        VoidAction(() => financeService.voidExpense(e.id))
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ExpenseForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />}
            {printingExpense && (
                <PrintPreviewModal isOpen={!!printingExpense} onClose={() => setPrintingExpense(null)} title="طباعة سند صرف">
                    <ExpensePrintable expense={printingExpense} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

const DepositsView: React.FC = () => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">حركات الودائع</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">إضافة حركة</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">التاريخ</th>
                            <th className="px-6 py-3 border border-border">العقد</th>
                            <th className="px-6 py-3 border border-border">النوع</th>
                            <th className="px-6 py-3 border border-border">المبلغ</th>
                            <th className="px-6 py-3 border border-border">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {db.depositTxs.map(tx => {
                            const contract = db.contracts.find(c => c.id === tx.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            const typeMap = {'DEPOSIT_IN': 'إيداع', 'DEPOSIT_DEDUCT': 'خصم', 'DEPOSIT_RETURN': 'إرجاع'};
                            return (
                                <tr key={tx.id} className="bg-card">
                                    <td className="px-6 py-4 border border-border">{formatDate(tx.date)}</td>
                                    <td className="px-6 py-4 border border-border">{tenant?.name || '-'}</td>
                                    <td className="px-6 py-4 border border-border font-bold">{typeMap[tx.type]}</td>
                                    {/* FIX: Corrected path to currency settings */}
                                    <td className="px-6 py-4 font-mono border border-border">{formatCurrency(tx.amount, db.settings.operational.currency)}</td>
                                    {/* FIX: Use dataService for data manipulation */}
                                    <td className="px-6 py-4 border border-border"><ActionsMenu items={[DeleteAction(async () => await dataService.remove('depositTxs', tx.id))]}/></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <DepositTxForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const OwnerSettlementsView: React.FC = () => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSettlement, setEditingSettlement] = useState<OwnerSettlement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = useMemo(() => db.ownerSettlements.filter(s => {
        const owner = db.owners.find(o => o.id === s.ownerId);
        return s.no.includes(searchTerm) || owner?.name.includes(searchTerm);
    }), [db.ownerSettlements, db.owners, searchTerm]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">تسويات الملاك</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">إضافة تسوية</button>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="بحث بالتسويات..." />
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">الرقم</th>
                            <th className="px-6 py-3 border border-border">التاريخ</th>
                            <th className="px-6 py-3 border border-border">المالك</th>
                            <th className="px-6 py-3 border border-border">المبلغ</th>
                            <th className="px-6 py-3 border border-border">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => {
                            const owner = db.owners.find(o => o.id === s.ownerId);
                            return (
                                <tr key={s.id} className="bg-card">
                                    <td className="px-6 py-4 font-mono border border-border">{s.no}</td>
                                    <td className="px-6 py-4 border border-border">{formatDate(s.date)}</td>
                                    <td className="px-6 py-4 border border-border">{owner?.name || '-'}</td>
                                    {/* FIX: Corrected path to currency settings */}
                                    <td className="px-6 py-4 font-bold border border-border text-green-600">{formatCurrency(s.amount, db.settings.operational.currency)}</td>
                                    <td className="px-6 py-4 border border-border">
                                        {/* FIX: Use dataService for data manipulation */}
                                        <ActionsMenu items={[ EditAction(() => { setEditingSettlement(s); setIsModalOpen(true); }), DeleteAction(async () => await dataService.remove('ownerSettlements', s.id)) ]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <OwnerSettlementForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSettlement(null); }} settlement={editingSettlement} />}
        </div>
    );
};

const CHECK_STATUS_AR: Record<string, string> = { PENDING: 'معلق', DEPOSITED: 'مودع', CLEARED: 'محصّل', BOUNCED: 'مرتجع' };

const ReceiptForm: React.FC<{ isOpen: boolean, onClose: () => void, receipt: Receipt | null }> = ({ isOpen, onClose, receipt }) => {
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState('');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [channel, setChannel] = useState<Receipt['channel']>('CASH');
    const [amount, setAmount] = useState(0);
    const [ref, setRef] = useState('');
    const [notes, setNotes] = useState('');
    const [checkNumber, setCheckNumber] = useState('');
    const [checkBank, setCheckBank] = useState('');
    const [checkDate, setCheckDate] = useState('');
    const [checkStatus, setCheckStatus] = useState<Receipt['checkStatus']>('PENDING');
    
    useEffect(() => {
        if (receipt) {
            setContractId(receipt.contractId); setDateTime(receipt.dateTime.slice(0, 16)); setChannel(receipt.channel);
            setAmount(receipt.amount); setRef(receipt.ref); setNotes(receipt.notes);
            setCheckNumber(receipt.checkNumber || ''); setCheckBank(receipt.checkBank || '');
            setCheckDate(receipt.checkDate || ''); setCheckStatus(receipt.checkStatus || 'PENDING');
        }
    }, [receipt]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (channel === 'CHECK' && !checkNumber) {
            toast.error('يرجى إدخال رقم الشيك.');
            return;
        }
        const data: any = { contractId, dateTime, channel, amount, ref, notes, status: 'POSTED' as const };
        if (channel === 'CHECK') {
            data.checkNumber = checkNumber;
            data.checkBank = checkBank;
            data.checkDate = checkDate;
            data.checkStatus = checkStatus;
        }
        if (receipt) await dataService.update('receipts', receipt.id, data); else await dataService.add('receipts', data);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={receipt ? 'تعديل سند قبض' : 'إضافة سند قبض'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {receipt && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">لتعديل تاريخ هذه الحركة، قم بتغيير حقل التاريخ واحفظ التغييرات. سيؤثر هذا على التقارير المالية.</p>}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs">العقد</label><select value={contractId} onChange={e=>setContractId(e.target.value)} required>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}</select></div>
                    <div><label className="text-xs">التاريخ</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required /></div>
                    <div><label className="text-xs">المبلغ</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required /></div>
                    <div><label className="text-xs">طريقة الدفع</label><select value={channel} onChange={e=>setChannel(e.target.value as any)}><option value="CASH">نقدي</option><option value="BANK">تحويل بنكي</option><option value="POS">شبكة</option><option value="CHECK">شيك</option><option value="OTHER">أخرى</option></select></div>
                </div>
                {channel === 'CHECK' && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">رقم الشيك *</label><input value={checkNumber} onChange={e=>setCheckNumber(e.target.value)} required placeholder="رقم الشيك" /></div>
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">البنك</label><input value={checkBank} onChange={e=>setCheckBank(e.target.value)} placeholder="اسم البنك" /></div>
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">تاريخ الاستحقاق</label><input type="date" value={checkDate} onChange={e=>setCheckDate(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">حالة الشيك</label><select value={checkStatus} onChange={e=>setCheckStatus(e.target.value as any)}><option value="PENDING">معلق</option><option value="DEPOSITED">مودع</option><option value="CLEARED">محصّل</option><option value="BOUNCED">مرتجع</option></select></div>
                    </div>
                )}
                <input placeholder="مرجع / رقم الحوالة" value={ref} onChange={e=>setRef(e.target.value)} />
                <textarea placeholder="ملاحظات" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} />
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button><button type="submit" className="btn btn-primary">حفظ</button></div>
            </form>
        </Modal>
    );
};

const ExpenseForm: React.FC<{ isOpen: boolean, onClose: () => void, expense: Expense | null }> = ({ isOpen, onClose, expense }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState<string | null>(null);
    const [category, setCategory] = useState('صيانة');
    const [amount, setAmount] = useState(0);
    const [chargedTo, setChargedTo] = useState<Expense['chargedTo']>('OWNER');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));

    useEffect(() => {
        if (expense) {
            setContractId(expense.contractId); setCategory(expense.category); setAmount(expense.amount);
            setChargedTo(expense.chargedTo || 'OWNER'); setDateTime(expense.dateTime.slice(0, 16));
        }
    }, [expense]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { contractId, dateTime, category, amount, status: 'POSTED' as const, chargedTo, ref: '', notes: '' };
        if (expense) await dataService.update('expenses', expense.id, data); else await dataService.add('expenses', data);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'تعديل مصروف' : 'إضافة مصروف'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {expense && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">لتعديل تاريخ هذه الحركة، قم بتغيير حقل التاريخ واحفظ التغييرات. سيؤثر هذا على التقارير المالية.</p>}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs">التصنيف</label><input value={category} onChange={e=>setCategory(e.target.value)} required /></div>
                    <div><label className="text-xs">المبلغ</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required /></div>
                    <div><label className="text-xs">يخصم من</label><select value={chargedTo} onChange={e=>setChargedTo(e.target.value as any)}><option value="OWNER">المالك</option><option value="OFFICE">المكتب</option><option value="TENANT">المستأجر</option></select></div>
                    <div><label className="text-xs">العقد المرتبط</label><select value={contractId || ''} onChange={e=>setContractId(e.target.value || null)}><option value="">-- مصروف مكتب عام --</option>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select></div>
                    <div><label className="text-xs">التاريخ</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button><button type="submit" className="btn btn-primary">حفظ</button></div>
            </form>
        </Modal>
    );
};

const DepositTxForm: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState(db.contracts[0]?.id || '');
    const [type, setType] = useState<DepositTx['type']>('DEPOSIT_IN');
    const [amount, setAmount] = useState(0);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await dataService.add('depositTxs', { contractId, type, amount, date: new Date().toISOString().slice(0, 10), note: '' });
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="حركة وديعة">
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={contractId} onChange={e=>setContractId(e.target.value)} required>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select>
                <select value={type} onChange={e=>setType(e.target.value as any)}><option value="DEPOSIT_IN">إيداع جديد</option><option value="DEPOSIT_RETURN">إرجاع للمستأجر</option><option value="DEPOSIT_DEDUCT">خصم إصلاحات</option></select>
                <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required placeholder="المبلغ" />
                <button type="submit" className="btn btn-primary w-full">حفظ الحركة</button>
            </form>
        </Modal>
    );
};

const OwnerSettlementForm: React.FC<{ isOpen: boolean, onClose: () => void, settlement: OwnerSettlement | null }> = ({ isOpen, onClose, settlement }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [ownerId, setOwnerId] = useState(db.owners[0]?.id || '');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => { if (settlement) { setOwnerId(settlement.ownerId); setAmount(settlement.amount); setDate(settlement.date); } }, [settlement]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ownerId, amount, date, method: 'BANK' as const, ref: '', notes: '' };
        if (settlement) await dataService.update('ownerSettlements', settlement.id, data); else await dataService.add('ownerSettlements', data);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={settlement ? "تعديل تسوية مالية" : "تسوية مالية للمالك"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {settlement && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">لتعديل تاريخ هذه الحركة، قم بتغيير حقل التاريخ واحفظ التغييرات. سيؤثر هذا على التقارير المالية.</p>}
                <select value={ownerId} onChange={e=>setOwnerId(e.target.value)} required>{db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} required />
                <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required placeholder="المبلغ المحول" />
                <button type="submit" className="btn btn-primary w-full">تأكيد التسوية</button>
            </form>
        </Modal>
    );
};

export default Financials;