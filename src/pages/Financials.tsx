
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
import { useLocation } from 'react-router-dom';

const safeText = (v: unknown) => String(v ?? '');
const matches = (value: unknown, term: string) => safeText(value).toLowerCase().includes(term.toLowerCase());

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
                    <p className="text-sm">Ù‡Ø§ØªÙ: {company.phone}</p>
                </div>
                <div className="text-left">
                    <h2 className="text-3xl font-bold text-red-600">Ø³Ù†Ø¯ ØµØ±Ù</h2>
                    <p className="mt-2">Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯: <span className="font-mono">{expense.no}</span></p>
                    <p>Ø§Ù„ØªØ§Ø±ÙŠØ®: <span className="font-mono">{formatDateTime(expense.dateTime)}</span></p>
                </div>
            </header>
            <main className="mt-8 text-lg flex-grow">
                <div className="flex items-center mb-5"><span className="w-48 font-bold">ØµØ±Ù Ø¥Ù„Ù‰ Ø§Ù„Ø³ÙŠØ¯/Ø©:</span><span>{expense.payee || expense.ref || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</span></div>
                {/* FIX: Corrected path to currency settings */}
                <div className="flex items-center mb-5"><span className="w-48 font-bold">Ù…Ø¨Ù„ØºØ§Ù‹ ÙˆÙ‚Ø¯Ø±Ù‡:</span><span className="font-bold text-xl px-4 py-2 border-2 border-border rounded-md bg-background">{formatCurrency(expense.amount, db.settings.operational.currency)}</span></div>
                <div className="flex items-start mb-5"><span className="w-48 font-bold">ÙˆØ°Ù„Ùƒ Ø¹Ù†:</span><span className="flex-1">{expensePurpose}</span></div>
            </main>
            <footer className="mt-8 pt-8 flex justify-around text-center">
                <div><p className="font-bold">ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨</p><p className="mt-12">.........................</p></div>
                <div><p className="font-bold">ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙ„Ù…</p><p className="mt-12">.........................</p></div>
            </footer>
        </div>
    );
};

const Financials: React.FC = () => {
    const { db } = useApp();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'receipts' | 'expenses' | 'deposits' | 'settlements'>('receipts');

    useEffect(() => {
        const path = location.pathname.toLowerCase();
        if (path.includes('/receipts')) setActiveTab('receipts');
        else if (path.includes('/expenses')) setActiveTab('expenses');
        else if (path.includes('/deposits')) setActiveTab('deposits');
        else if (path.includes('/settlements')) setActiveTab('settlements');
    }, [location.pathname]);

    const summary = useMemo(() => {
        const receiptsTotal = db.receipts.filter(r => r.status === 'POSTED').reduce((s, r) => s + (r.amount || 0), 0);
        const expensesTotal = db.expenses.filter(e => e.status === 'POSTED').reduce((s, e) => s + (e.amount || 0), 0);
        const depositsTotal = db.depositTxs.reduce((s, tx) => s + (tx.type === 'DEPOSIT_IN' ? tx.amount : -tx.amount), 0);
        const settlementsTotal = db.ownerSettlements.reduce((s, o) => s + (o.amount || 0), 0);
        return { receiptsTotal, expensesTotal, depositsTotal, settlementsTotal };
    }, [db]);

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                    <div className="p-3 rounded-lg border border-border bg-background">
                        <p className="text-xs text-text-muted">إجمالي المقبوضات</p>
                        <p className="font-bold">{formatCurrency(summary.receiptsTotal, db.settings.operational.currency)}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                        <p className="text-xs text-text-muted">إجمالي المصروفات</p>
                        <p className="font-bold">{formatCurrency(summary.expensesTotal, db.settings.operational.currency)}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                        <p className="text-xs text-text-muted">صافي الودائع</p>
                        <p className="font-bold">{formatCurrency(summary.depositsTotal, db.settings.operational.currency)}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                        <p className="text-xs text-text-muted">تسويات الملاك</p>
                        <p className="font-bold">{formatCurrency(summary.settlementsTotal, db.settings.operational.currency)}</p>
                    </div>
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
        const term = searchTerm.trim().toLowerCase();
        return db.receipts.filter(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return term === '' || matches(r.no, term) || matches(tenant?.name, term);
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
            tenantName: tenant?.name || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ',
            // FIX: Corrected path to currency settings
            amount: formatCurrency(printingReceipt.amount, db.settings.operational.currency),
            description: printingReceipt.notes || `Ø¯ÙØ¹Ø© Ø¥ÙŠØ¬Ø§Ø± Ù„Ù„ÙˆØ­Ø¯Ø© ${unit?.name || ''}`
        };
    }, [printingReceipt, db]);

    const handleExportReceiptsCsv = () => {
        const rows = filteredReceipts.map(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return {
                'Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯': r.no,
                'Ø§Ù„ØªØ§Ø±ÙŠØ®': formatDateTime(r.dateTime),
                'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±': tenant?.name || '',
                'Ø§Ù„Ù…Ø¨Ù„Øº': r.amount,
                'Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹': CHANNEL_AR[r.channel as keyof typeof CHANNEL_AR] || r.channel,
                'Ø§Ù„Ø­Ø§Ù„Ø©': RECEIPT_STATUS_AR[r.status as keyof typeof RECEIPT_STATUS_AR] || r.status,
                'Ù…Ù„Ø§Ø­Ø¸Ø§Øª': r.notes || '',
            };
        });
        exportToCsv('Ø³Ù†Ø¯Ø§Øª_Ù‚Ø¨Ø¶_rentrix', rows);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Ù‚Ø§Ø¦Ù…Ø© Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù‚Ø¨Ø¶</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportReceiptsCsv} className="btn btn-secondary flex items-center gap-1">
                        <Download size={14} />
                        ØªØµØ¯ÙŠØ± CSV
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Ø¥Ø¶Ø§ÙØ© Ø³Ù†Ø¯ Ù‚Ø¨Ø¶</button>
                </div>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯ Ø£Ùˆ Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±..." />
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
                            <th className="px-6 py-3 border border-border">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                            <th className="px-6 py-3 border border-border">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
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
                                                Ø´ÙŠÙƒ #{r.checkNumber} {r.checkBank && `- ${r.checkBank}`}
                                                {r.checkStatus && <span className={`mr-1 px-1 py-0.5 rounded ${r.checkStatus === 'CLEARED' ? 'bg-green-100 text-green-700' : r.checkStatus === 'BOUNCED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{CHECK_STATUS_AR[r.checkStatus]}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 border border-border"><span className={`status-badge ${r.status === 'POSTED' ? 'status-success' : 'status-danger'}`}>{RECEIPT_STATUS_AR[r.status as keyof typeof RECEIPT_STATUS_AR] || r.status}</span></td>
                                    <td className="px-6 py-4 border border-border">
                                        <ActionsMenu items={[
                                            EditAction(() => { setEditingReceipt(r); setIsModalOpen(true); }),
                                            PrintAction(() => setPrintingReceipt(r)),
                                            { label: 'Ø¥Ø±Ø³Ø§Ù„ ÙˆØ§ØªØ³Ø§Ø¨', icon: <MessageCircle size={16} />, onClick: () => setWhatsAppContext({ recipient: tenant, type: 'receipt', data: { receipt: r } }) },
                                            // FIX: Use financeService for financial operations
                                            VoidAction(() => financeService.voidReceipt(r.id))
                                        ]} />
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredReceipts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-6 text-center text-text-muted border border-border">
                                    لا توجد سندات قبض مطابقة.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ReceiptForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingReceipt(null); }} receipt={editingReceipt} />}
            {printingReceipt && receiptDataForPrint && (
                <PrintPreviewModal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="Ø·Ø¨Ø§Ø¹Ø© Ø³Ù†Ø¯ Ù‚Ø¨Ø¶">
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
        const term = searchTerm.trim().toLowerCase();
        return db.expenses.filter(e =>
            term === '' || matches(e.no, term) || matches(e.category, term) || matches(e.notes, term)
        )
                         .sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.expenses, searchTerm]);

    const handleExportExpensesCsv = () => {
        const rows = filteredExpenses.map(e => ({
            'Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯': e.no,
            'Ø§Ù„ØªØ§Ø±ÙŠØ®': formatDateTime(e.dateTime),
            'Ø§Ù„ØªØµÙ†ÙŠÙ': e.category,
            'Ø§Ù„Ù…Ø¨Ù„Øº': e.amount,
            'Ø§Ù„Ø­Ø§Ù„Ø©': EXPENSE_STATUS_AR[e.status as keyof typeof EXPENSE_STATUS_AR] || e.status,
            'Ù…Ù„Ø§Ø­Ø¸Ø§Øª': e.notes || '',
        }));
        exportToCsv('Ù…ØµØ±ÙˆÙØ§Øª_rentrix', rows);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportExpensesCsv} className="btn btn-secondary flex items-center gap-1">
                        <Download size={14} />
                        ØªØµØ¯ÙŠØ± CSV
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ</button>
                </div>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„Ù…ØµØ±ÙˆÙ..." />
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„ØªØµÙ†ÙŠÙ</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                            <th className="px-6 py-3 border border-border">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
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
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-6 text-center text-text-muted border border-border">
                                    لا توجد مصروفات مطابقة.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ExpenseForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />}
            {printingExpense && (
                <PrintPreviewModal isOpen={!!printingExpense} onClose={() => setPrintingExpense(null)} title="Ø·Ø¨Ø§Ø¹Ø© Ø³Ù†Ø¯ ØµØ±Ù">
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
                <h2 className="text-xl font-bold">Ø­Ø±ÙƒØ§Øª Ø§Ù„ÙˆØ¯Ø§Ø¦Ø¹</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Ø¥Ø¶Ø§ÙØ© Ø­Ø±ÙƒØ©</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ø¹Ù‚Ø¯</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù†ÙˆØ¹</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
                            <th className="px-6 py-3 border border-border">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
                        </tr>
                    </thead>
                    <tbody>
                        {db.depositTxs.map(tx => {
                            const contract = db.contracts.find(c => c.id === tx.contractId);
                            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                            const typeMap = {'DEPOSIT_IN': 'Ø¥ÙŠØ¯Ø§Ø¹', 'DEPOSIT_DEDUCT': 'Ø®ØµÙ…', 'DEPOSIT_RETURN': 'Ø¥Ø±Ø¬Ø§Ø¹'};
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
                        {db.depositTxs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-6 text-center text-text-muted border border-border">
                                    لا توجد حركات ودائع.
                                </td>
                            </tr>
                        )}
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

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return db.ownerSettlements.filter(s => {
            const owner = db.owners.find(o => o.id === s.ownerId);
            return term === '' || matches(s.no, term) || matches(owner?.name, term);
        });
    }, [db.ownerSettlements, db.owners, searchTerm]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">ØªØ³ÙˆÙŠØ§Øª Ø§Ù„Ù…Ù„Ø§Ùƒ</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Ø¥Ø¶Ø§ÙØ© ØªØ³ÙˆÙŠØ©</button>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„ØªØ³ÙˆÙŠØ§Øª..." />
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="bg-background text-text uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ø±Ù‚Ù…</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù…Ø§Ù„Ùƒ</th>
                            <th className="px-6 py-3 border border-border">Ø§Ù„Ù…Ø¨Ù„Øº</th>
                            <th className="px-6 py-3 border border-border">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
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
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-6 text-center text-text-muted border border-border">
                                    لا توجد تسويات ملاك مطابقة.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <OwnerSettlementForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSettlement(null); }} settlement={editingSettlement} />}
        </div>
    );
};

const CHECK_STATUS_AR: Record<string, string> = { PENDING: 'Ù…Ø¹Ù„Ù‚', DEPOSITED: 'Ù…ÙˆØ¯Ø¹', CLEARED: 'Ù…Ø­ØµÙ‘Ù„', BOUNCED: 'Ù…Ø±ØªØ¬Ø¹' };

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
            toast.error('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ø§Ù„Ø´ÙŠÙƒ.');
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
        <Modal isOpen={isOpen} onClose={onClose} title={receipt ? 'ØªØ¹Ø¯ÙŠÙ„ Ø³Ù†Ø¯ Ù‚Ø¨Ø¶' : 'Ø¥Ø¶Ø§ÙØ© Ø³Ù†Ø¯ Ù‚Ø¨Ø¶'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {receipt && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">Ù„ØªØ¹Ø¯ÙŠÙ„ ØªØ§Ø±ÙŠØ® Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø±ÙƒØ©ØŒ Ù‚Ù… Ø¨ØªØºÙŠÙŠØ± Ø­Ù‚Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ø­ÙØ¸ Ø§Ù„ØªØºÙŠÙŠØ±Ø§Øª. Ø³ÙŠØ¤Ø«Ø± Ù‡Ø°Ø§ Ø¹Ù„Ù‰ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø§Ù„ÙŠØ©.</p>}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs">Ø§Ù„Ø¹Ù‚Ø¯</label><select value={contractId} onChange={e=>setContractId(e.target.value)} required>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}</select></div>
                    <div><label className="text-xs">Ø§Ù„ØªØ§Ø±ÙŠØ®</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required /></div>
                    <div><label className="text-xs">Ø§Ù„Ù…Ø¨Ù„Øº</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required /></div>
                    <div><label className="text-xs">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹</label><select value={channel} onChange={e=>setChannel(e.target.value as any)}><option value="CASH">Ù†Ù‚Ø¯ÙŠ</option><option value="BANK">ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ</option><option value="POS">Ø´Ø¨ÙƒØ©</option><option value="CHECK">Ø´ÙŠÙƒ</option><option value="OTHER">Ø£Ø®Ø±Ù‰</option></select></div>
                </div>
                {channel === 'CHECK' && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">Ø±Ù‚Ù… Ø§Ù„Ø´ÙŠÙƒ *</label><input value={checkNumber} onChange={e=>setCheckNumber(e.target.value)} required placeholder="Ø±Ù‚Ù… Ø§Ù„Ø´ÙŠÙƒ" /></div>
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">Ø§Ù„Ø¨Ù†Ùƒ</label><input value={checkBank} onChange={e=>setCheckBank(e.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„Ø¨Ù†Ùƒ" /></div>
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</label><input type="date" value={checkDate} onChange={e=>setCheckDate(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-blue-700 dark:text-blue-300">Ø­Ø§Ù„Ø© Ø§Ù„Ø´ÙŠÙƒ</label><select value={checkStatus} onChange={e=>setCheckStatus(e.target.value as any)}><option value="PENDING">Ù…Ø¹Ù„Ù‚</option><option value="DEPOSITED">Ù…ÙˆØ¯Ø¹</option><option value="CLEARED">Ù…Ø­ØµÙ‘Ù„</option><option value="BOUNCED">Ù…Ø±ØªØ¬Ø¹</option></select></div>
                    </div>
                )}
                <input placeholder="Ù…Ø±Ø¬Ø¹ / Ø±Ù‚Ù… Ø§Ù„Ø­ÙˆØ§Ù„Ø©" value={ref} onChange={e=>setRef(e.target.value)} />
                <textarea placeholder="Ù…Ù„Ø§Ø­Ø¸Ø§Øª" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} />
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className="btn btn-ghost">Ø¥Ù„ØºØ§Ø¡</button><button type="submit" className="btn btn-primary">Ø­ÙØ¸</button></div>
            </form>
        </Modal>
    );
};

const ExpenseForm: React.FC<{ isOpen: boolean, onClose: () => void, expense: Expense | null }> = ({ isOpen, onClose, expense }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState<string | null>(null);
    const [category, setCategory] = useState('ØµÙŠØ§Ù†Ø©');
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
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'ØªØ¹Ø¯ÙŠÙ„ Ù…ØµØ±ÙˆÙ' : 'Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {expense && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">Ù„ØªØ¹Ø¯ÙŠÙ„ ØªØ§Ø±ÙŠØ® Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø±ÙƒØ©ØŒ Ù‚Ù… Ø¨ØªØºÙŠÙŠØ± Ø­Ù‚Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ø­ÙØ¸ Ø§Ù„ØªØºÙŠÙŠØ±Ø§Øª. Ø³ÙŠØ¤Ø«Ø± Ù‡Ø°Ø§ Ø¹Ù„Ù‰ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø§Ù„ÙŠØ©.</p>}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs">Ø§Ù„ØªØµÙ†ÙŠÙ</label><input value={category} onChange={e=>setCategory(e.target.value)} required /></div>
                    <div><label className="text-xs">Ø§Ù„Ù…Ø¨Ù„Øº</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required /></div>
                    <div><label className="text-xs">ÙŠØ®ØµÙ… Ù…Ù†</label><select value={chargedTo} onChange={e=>setChargedTo(e.target.value as any)}><option value="OWNER">Ø§Ù„Ù…Ø§Ù„Ùƒ</option><option value="OFFICE">Ø§Ù„Ù…ÙƒØªØ¨</option><option value="TENANT">Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±</option></select></div>
                    <div><label className="text-xs">Ø§Ù„Ø¹Ù‚Ø¯ Ø§Ù„Ù…Ø±ØªØ¨Ø·</label><select value={contractId || ''} onChange={e=>setContractId(e.target.value || null)}><option value="">-- Ù…ØµØ±ÙˆÙ Ù…ÙƒØªØ¨ Ø¹Ø§Ù… --</option>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select></div>
                    <div><label className="text-xs">Ø§Ù„ØªØ§Ø±ÙŠØ®</label><input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className="btn btn-ghost">Ø¥Ù„ØºØ§Ø¡</button><button type="submit" className="btn btn-primary">Ø­ÙØ¸</button></div>
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
        <Modal isOpen={isOpen} onClose={onClose} title="Ø­Ø±ÙƒØ© ÙˆØ¯ÙŠØ¹Ø©">
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={contractId} onChange={e=>setContractId(e.target.value)} required>{db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name}</option>)}</select>
                <select value={type} onChange={e=>setType(e.target.value as any)}><option value="DEPOSIT_IN">Ø¥ÙŠØ¯Ø§Ø¹ Ø¬Ø¯ÙŠØ¯</option><option value="DEPOSIT_RETURN">Ø¥Ø±Ø¬Ø§Ø¹ Ù„Ù„Ù…Ø³ØªØ£Ø¬Ø±</option><option value="DEPOSIT_DEDUCT">Ø®ØµÙ… Ø¥ØµÙ„Ø§Ø­Ø§Øª</option></select>
                <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required placeholder="Ø§Ù„Ù…Ø¨Ù„Øº" />
                <button type="submit" className="btn btn-primary w-full">Ø­ÙØ¸ Ø§Ù„Ø­Ø±ÙƒØ©</button>
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
        <Modal isOpen={isOpen} onClose={onClose} title={settlement ? "ØªØ¹Ø¯ÙŠÙ„ ØªØ³ÙˆÙŠØ© Ù…Ø§Ù„ÙŠØ©" : "ØªØ³ÙˆÙŠØ© Ù…Ø§Ù„ÙŠØ© Ù„Ù„Ù…Ø§Ù„Ùƒ"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {settlement && <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">Ù„ØªØ¹Ø¯ÙŠÙ„ ØªØ§Ø±ÙŠØ® Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø±ÙƒØ©ØŒ Ù‚Ù… Ø¨ØªØºÙŠÙŠØ± Ø­Ù‚Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ø­ÙØ¸ Ø§Ù„ØªØºÙŠÙŠØ±Ø§Øª. Ø³ÙŠØ¤Ø«Ø± Ù‡Ø°Ø§ Ø¹Ù„Ù‰ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø§Ù„ÙŠØ©.</p>}
                <select value={ownerId} onChange={e=>setOwnerId(e.target.value)} required>{db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} required />
                <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} required placeholder="Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø­ÙˆÙ„" />
                <button type="submit" className="btn btn-primary w-full">ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ³ÙˆÙŠØ©</button>
            </form>
        </Modal>
    );
};

export default Financials;

