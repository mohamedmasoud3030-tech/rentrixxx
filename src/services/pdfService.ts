
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cairoFontBase64 } from './cairoFontBase64';
import { Settings, Contract, Database, Invoice, Expense, UtilityType, UTILITY_TYPE_AR } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';

type PdfRow = Record<string, any>;
type PdfCell = { content: string; colSpan?: number; styles?: Record<string, unknown> };
type AutoTableDoc = jsPDF & { autoTable: (opts: Record<string, unknown>) => void; lastAutoTable?: { finalY: number } };
const asAutoTableDoc = (doc: jsPDF) => doc as AutoTableDoc;


// Helper to create a jsPDF instance with Arabic font support and a standard header
const getArabicDoc = (title: string, subtitle: string, settings: Settings) => {
    try {
        const doc = new jsPDF();
        
        // Add Cairo font for Arabic support
        if (cairoFontBase64) {
            doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            doc.setFont('Cairo');
        } else {
            doc.setFont('helvetica');
        }

        // Header
        doc.setFontSize(16);
        // FIX: Corrected path to company settings
        doc.text(settings.general.company.name, 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(title, 105, 22, { align: 'center' });
        doc.setFontSize(10);
        doc.text(subtitle, 105, 28, { align: 'center' });

        return doc;
    } catch (error) {
        console.error('Error creating PDF document:', error);
        // Fallback to basic PDF without Arabic font
        const doc = new jsPDF();
        doc.setFont('helvetica');
        doc.setFontSize(16);
        doc.text(settings.general.company.name, 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(title, 105, 22, { align: 'center' });
        doc.setFontSize(10);
        doc.text(subtitle, 105, 28, { align: 'center' });
        return doc;
    }
};

// --- Financial Reports ---

export const exportRentRollToPdf = (units: PdfRow[], totals: PdfRow, settings: Settings) => {
    const doc = getArabicDoc('تقرير قائمة الإيجارات (Rent Roll)', `تاريخ التقرير: ${formatDate(new Date().toISOString())}`, settings);
    
    const head = [['الرصيد المستحق', 'التأمين', 'الإيجار', 'انتهاء العقد', 'بدء العقد', 'المستأجر', 'الحالة', 'الوحدة', 'العقار']];
    const body = units.map(item => [
        // FIX: Corrected path to currency settings
        formatCurrency(item.balance, settings.operational.currency),
        formatCurrency(item.deposit, settings.operational.currency),
        formatCurrency(item.rent, settings.operational.currency),
        item.endDate !== '-' ? formatDate(item.endDate) : '-',
        item.startDate !== '-' ? formatDate(item.startDate) : '-',
        item.tenant,
        item.status,
        item.unit,
        item.property,
    ]);
    
    body.push([
        // FIX: Corrected path to currency settings
        { content: formatCurrency(totals.totalBalance, settings.operational.currency), styles: { fontStyle: 'bold' } },
        { content: '', styles: {} },
        // FIX: Corrected path to currency settings
        { content: formatCurrency(totals.totalRent, settings.operational.currency), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي (للوحدات المؤجرة)', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } },
    ]);

    asAutoTableDoc(doc).autoTable({
        head,
        body,
        startY: 35,
        styles: { font: 'Cairo', halign: 'right' },
        headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    });

    doc.save('Rent_Roll_Report.pdf');
};

export const exportOwnerLedgerToPdf = (transactions: PdfRow[], totals: PdfRow, settings: Settings, ownerName: string, dateRange: string, showCommission: boolean) => {
    const doc = getArabicDoc(`كشف حساب المالك: ${ownerName}`, dateRange, settings);

    const head = showCommission
        ? [['صافي المبلغ للمالك', 'حصة المكتب', 'إجمالي المبلغ', 'البيان', 'التاريخ']]
        : [['صافي المبلغ للمالك', 'إجمالي المبلغ', 'البيان', 'التاريخ']];
        
    const body = transactions.map(tx => {
        const row = [
            // FIX: Corrected path to currency settings
            formatCurrency(tx.net, settings.operational.currency),
            formatCurrency(tx.gross, settings.operational.currency),
            tx.details,
            formatDate(tx.date),
        ];
        if (showCommission) {
            // FIX: Corrected path to currency settings
            row.splice(1, 0, tx.officeShare > 0 ? formatCurrency(-tx.officeShare, settings.operational.currency) : '-');
        }
        return row;
    });

    const footerRow = [
        // FIX: Corrected path to currency settings
        { content: formatCurrency(totals.net, settings.operational.currency), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totals.gross, settings.operational.currency), styles: { fontStyle: 'bold' } },
        { content: 'الرصيد الختامي للفترة', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
    ];

    if (showCommission) {
         // FIX: Corrected path to currency settings
         footerRow.splice(1, 0, { content: formatCurrency(-totals.officeShare, settings.operational.currency), styles: { fontStyle: 'bold' } });
         (footerRow[3] as PdfCell).colSpan = 2; // Adjust colSpan
    } else {
        (footerRow[2] as PdfCell).colSpan = 2;
    }

    asAutoTableDoc(doc).autoTable({
        head,
        body,
        foot: [footerRow],
        startY: 35,
        styles: { font: 'Cairo', halign: 'right' },
        headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    });

    doc.save(`Owner_Ledger_${ownerName}.pdf`);
};

export const exportTenantStatementToPdf = (statementData: { tenant?: PdfRow; unit?: PdfRow; property?: PdfRow; statement: PdfRow[]; finalBalance: number }, settings: Settings) => {
    const { tenant, unit, property, statement, finalBalance } = statementData;
    const doc = getArabicDoc('كشف حساب مستأجر', `للمستأجر: ${tenant?.name} - الوحدة: ${unit?.name}`, settings);
    
    doc.setFontSize(10);
    doc.text(`العقار: ${property?.name}`, 200, 40, { align: 'right' });
    doc.text(`الهاتف: ${tenant?.phone}`, 20, 40, { align: 'left' });

    const head = [['الرصيد', 'دائن', 'مدين', 'البيان', 'التاريخ']];
    const body = statement.map((tx: PdfRow) => [
        // FIX: Corrected path to currency settings
        formatCurrency(tx.balance, settings.operational.currency),
        tx.credit > 0 ? formatCurrency(tx.credit, settings.operational.currency) : '-',
        tx.debit > 0 ? formatCurrency(tx.debit, settings.operational.currency) : '-',
        tx.description,
        formatDate(tx.date),
    ]);

    asAutoTableDoc(doc).autoTable({
        head,
        body,
        foot: [[
            // FIX: Corrected path to currency settings
            { content: formatCurrency(finalBalance, settings.operational.currency), styles: { fontStyle: 'bold' } },
            { content: 'الرصيد النهائي المستحق', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } }
        ]],
        startY: 45,
        styles: { font: 'Cairo', halign: 'right' },
        headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    });

    doc.save(`Tenant_Statement_${tenant?.name}.pdf`);
};

export const exportIncomeStatementToPdf = (pnlData: { totalRevenue: number; totalExpense: number; netIncome: number; revenues: PdfRow[]; expenses: PdfRow[] }, settings: Settings, dateRange: string) => {
    const doc = getArabicDoc('قائمة الدخل', dateRange, settings);
    
    asAutoTableDoc(doc).autoTable({
        startY: 35,
        body: [
            // FIX: Corrected path to currency settings
            [{ content: 'الإيرادات', styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }, { content: formatCurrency(pnlData.totalRevenue, settings.operational.currency), styles: { fontStyle: 'bold' } }],
            ...pnlData.revenues.map((item: PdfRow) => [item.name, formatCurrency(item.balance, settings.operational.currency)]),
            [{ content: 'المصروفات', styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }, { content: `(${formatCurrency(pnlData.totalExpense, settings.operational.currency)})`, styles: { fontStyle: 'bold' } }],
            ...pnlData.expenses.map((item: PdfRow) => [item.name, `(${formatCurrency(item.balance, settings.operational.currency)})`]),
            [{ content: 'صافي الربح / (الخسارة)', styles: { fontStyle: 'bold', fillColor: '#e2e8f0' } }, { content: formatCurrency(pnlData.netIncome, settings.operational.currency), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        styles: { font: 'Cairo', halign: 'right' },
    });

    doc.save('Income_Statement.pdf');
};


export const exportTrialBalanceToPdf = (data: { lines: PdfRow[]; totalCredit: number; totalDebit: number }, settings: Settings, date: string) => {
    const doc = getArabicDoc('ميزان المراجعة', `حتى تاريخ ${formatDate(date)}`, settings);

    const head = [['دائن', 'مدين', 'اسم الحساب', 'رقم الحساب']];
    const body = data.lines.map((line: PdfRow) => [
        // FIX: Corrected path to currency settings
        line.credit > 0 ? formatCurrency(line.credit, settings.operational.currency) : '-',
        line.debit > 0 ? formatCurrency(line.debit, settings.operational.currency) : '-',
        line.name,
        line.no,
    ]);

    const footer = [[
        // FIX: Corrected path to currency settings
        { content: formatCurrency(data.totalCredit, settings.operational.currency), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(data.totalDebit, settings.operational.currency), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
    ]];
    
    asAutoTableDoc(doc).autoTable({
        head,
        body,
        foot: footer,
        startY: 35,
        styles: { font: 'Cairo', halign: 'right' },
        headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    });

    doc.save('Trial_Balance.pdf');
};

// --- Contract PDF ---

export const exportContractToPdf = (contract: Contract, db: Database) => {
    try {
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
    const owner = property ? db.owners.find(o => o.id === property.ownerId) : null;
    
    const doc = getArabicDoc('عقد إيجار', `رقم العقد: ${contract.id.slice(0, 8)}`, db.settings);

    let y = 40;
    const margin = 15;
    const maxWidth = doc.internal.pageSize.width - margin * 2;

    const addWrappedText = (text: string, options = {}) => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, doc.internal.pageSize.width - margin, y, { align: 'right', ...options });
        y += lines.length * 5; // Adjust line height
    };

    doc.setFontSize(10);
    addWrappedText(`انه في يوم .../.../...... الموافق ${formatDate(new Date(contract.createdAt).toISOString())} تم الاتفاق بين كل من الاطراف:`);
    y += 5;

    doc.setFontSize(11);
    // FIX: Corrected path to company settings
    addWrappedText(`الطرف الأول (المؤجر): ${owner?.name || db.settings.general.company.name}`);
    addWrappedText(`الطرف الثاني (المستأجر): ${tenant?.name}`);
    y += 5;

    doc.setFontSize(10);
    addWrappedText(`واتفق الطرفين على أن يستأجر الطرف الثاني من الطرف الأول ما هو ${unit?.type} رقم (${unit?.name}) في العقار (${property?.name}) الكائن في ${property?.location}.`);
    y += 5;
    
    addWrappedText(`ويسري عقد الايجار لمدة سنة ميلادية تبدأ من تاريخ ${formatDate(contract.start)} إلى تاريخ ${formatDate(contract.end)}.`);
    // FIX: Corrected path to currency settings
    addWrappedText(`مقابل إيجار شهري قدره (${formatCurrency(contract.rent, db.settings.operational.currency)})، يُدفع مقدماً كل شهر.`);
    addWrappedText(`كما قام الطرف الثاني بدفع مبلغ وقدره (${formatCurrency(contract.deposit, db.settings.operational.currency)}) كتأمين لا يرد إلا عند نهاية العقد.`);
    y += 10;
    
    // Add a few clauses for demonstration
    doc.setFontSize(12);
    addWrappedText('أحكام وشروط:');
    doc.setFontSize(9);
    addWrappedText('1. يلتزم الطرف الثاني (المستأجر) بسداد قيمة الإيجار في المواعيد المحددة.');
    addWrappedText('2. يلتزم الطرف الثاني بالمحافظة على العين المؤجرة واستعمالها للغرض المخصص لها.');
    addWrappedText('3. لا يجوز للطرف الثاني تأجير العين من الباطن أو التنازل عنها للغير دون موافقة خطية من الطرف الأول.');
    
    y = 250; // Move to bottom for signatures
    doc.text('توقيع الطرف الأول (المؤجر)', 170, y, { align: 'center'});
    doc.text('.........................', 170, y + 10, { align: 'center'});

    doc.text('توقيع الطرف الثاني (المستأجر)', 50, y, { align: 'center'});
    doc.text('.........................', 50, y + 10, { align: 'center'});

    doc.save(`Contract_${tenant?.name}.pdf`);
    } catch (error) {
        console.error('Error exporting contract to PDF:', error);
        throw new Error('فشل تصدير العقد إلى PDF');
    }
};

export const exportExpenseToPdf = (expense: Expense, db: Database) => {
    try {
        const { settings } = db;
        const doc = getArabicDoc('سند صرف', `رقم السند: ${expense.no}`, settings);

        doc.setFontSize(11);
        doc.text(`التاريخ: ${formatDate(expense.dateTime)}`, 200, 40, { align: 'right' });
        // FIX: Corrected path to currency settings
        doc.text(`المبلغ: ${formatCurrency(expense.amount, settings.operational.currency)}`, 200, 48, { align: 'right' });
        doc.text(`صرف إلى: ${expense.payee || 'غير محدد'}`, 200, 56, { align: 'right' });
        doc.text(`وذلك عن: ${expense.category} - ${expense.notes || ''}`, 200, 64, { align: 'right' });

        doc.save(`Expense_${expense.no}.pdf`);
    } catch (error) {
        console.error('Error exporting expense to PDF:', error);
        throw new Error('فشل تصدير المصروف إلى PDF');
    }
};

export const exportInvoiceToPdf = (invoice: Invoice, db: Database) => {
    try {
        const { settings } = db;
        const contract = db.contracts.find(c => c.id === invoice.contractId);
        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
        const doc = getArabicDoc('فاتورة', `رقم الفاتورة: ${invoice.no}`, settings);

        doc.setFontSize(11);
        doc.text(`إلى السيد/ة: ${tenant?.name || 'غير معروف'}`, 200, 40, { align: 'right' });
        doc.text(`تاريخ الاستحقاق: ${formatDate(invoice.dueDate)}`, 200, 48, { align: 'right' });

        asAutoTableDoc(doc).autoTable({
            head: [['المجموع', 'الضريبة', 'السعر', 'الكمية', 'البيان']],
            body: [[
                // FIX: Corrected path to currency settings
                formatCurrency(invoice.amount + (invoice.taxAmount || 0), settings.operational.currency),
                formatCurrency(invoice.taxAmount || 0, settings.operational.currency),
                formatCurrency(invoice.amount, settings.operational.currency),
                '1',
                invoice.notes || `فاتورة ${invoice.type}`
            ]],
            startY: 55,
            styles: { font: 'Cairo', halign: 'right' },
            headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        });

        const finalY = (asAutoTableDoc(doc).lastAutoTable?.finalY || 35) + 10;
        doc.setFontSize(12);
        doc.text('الإجمالي:', 200, finalY, { align: 'right' });
        // FIX: Corrected path to currency settings
        doc.text(formatCurrency(invoice.amount + (invoice.taxAmount || 0), settings.operational.currency), 150, finalY, { align: 'right' });

        doc.save(`Invoice_${invoice.no}.pdf`);
    } catch (error) {
        console.error('Error exporting invoice to PDF:', error);
        throw new Error('فشل تصدير الفاتورة إلى PDF');
    }
};

export const exportBalanceSheetToPdf = (data: { assets: PdfRow[]; liabilities: PdfRow[]; equity: PdfRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number }, settings: Settings, date: string) => {
    const doc = getArabicDoc('الميزانية العمومية', `كما في تاريخ ${formatDate(date)}`, settings);
    let y = 35;

    const drawSection = (title: string, items: PdfRow[], indent = 0) => {
        doc.setFontSize(12);
        doc.setFont('Cairo', 'bold');
        doc.text(title, 200, y, { align: 'right' });
        y += 7;
        doc.setFont('Cairo', 'normal');
        doc.setFontSize(10);
        items.forEach(item => {
            doc.text(item.name, 200 - indent * 5, y, { align: 'right' });
            // FIX: Corrected path to currency settings
            doc.text(formatCurrency(item.balance, settings.operational.currency), 50, y, { align: 'right' });
            y += 6;
            if (item.children) {
                drawSection('', item.children, indent + 1);
            }
        });
    };

    drawSection('الأصول', data.assets);
    doc.setFontSize(12);
    doc.setFont('Cairo', 'bold');
    doc.text('إجمالي الأصول', 200, y, { align: 'right' });
    // FIX: Corrected path to currency settings
    doc.text(formatCurrency(data.totalAssets, settings.operational.currency), 50, y, { align: 'right' });
    y += 10;
    
    drawSection('الالتزامات وحقوق الملكية', [...data.liabilities, ...data.equity]);
    doc.setFontSize(12);
    doc.setFont('Cairo', 'bold');
    doc.text('إجمالي الالتزامات وحقوق الملكية', 200, y, { align: 'right' });
    // FIX: Corrected path to currency settings
    doc.text(formatCurrency(data.totalLiabilities + data.totalEquity, settings.operational.currency), 50, y, { align: 'right' });

    doc.save('Balance_Sheet.pdf');
};

export const exportAgedReceivablesToPdf = (data: { lines: PdfRow[]; totals: PdfRow }, settings: Settings, date: string) => {
    const doc = getArabicDoc('تقرير أعمار الذمم المدينة', `كما في تاريخ ${formatDate(date)}`, settings);

    const head = [['+90 يوم', '61-90 يوم', '31-60 يوم', '1-30 يوم', 'حالي', 'الإجمالي', 'المستأجر']];
    const body = data.lines.map((line: PdfRow) => [
        formatCurrency(line['90+'], settings.operational.currency),
        formatCurrency(line['61-90'], settings.operational.currency),
        formatCurrency(line['31-60'], settings.operational.currency),
        formatCurrency(line['1-30'], settings.operational.currency),
        formatCurrency(line.current, settings.operational.currency),
        formatCurrency(line.total, settings.operational.currency),
        line.tenantName
    ]);
    const footer = [[
        formatCurrency(data.totals['90+'], settings.operational.currency),
        formatCurrency(data.totals['61-90'], settings.operational.currency),
        formatCurrency(data.totals['31-60'], settings.operational.currency),
        formatCurrency(data.totals['1-30'], settings.operational.currency),
        formatCurrency(data.totals.current, settings.operational.currency),
        formatCurrency(data.totals.total, settings.operational.currency),
        'الإجمالي'
    ]];

    asAutoTableDoc(doc).autoTable({
        head,
        body,
        foot: footer,
        startY: 35,
        styles: { font: 'Cairo', halign: 'right' },
        headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    });

    doc.save('Aged_Receivables.pdf');
};

const HEAD_STYLE = { fillColor: [30, 80, 130] as [number, number, number], fontStyle: 'bold' as const };
const FOOT_STYLE = { fillColor: [230, 230, 230] as [number, number, number], textColor: 0, fontStyle: 'bold' as const };
const TABLE_STYLE = { font: 'Cairo', halign: 'right' as const, fontSize: 9 };

export const exportDailyCollectionToPdf = (receipts: PdfRow[], totals: { cash: number; bank: number; check: number; total: number }, settings: Settings, date: string) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('كشف التحصيل اليومي', `بتاريخ ${formatDate(date)}`, settings);

    doc.setFontSize(9);
    let y = 33;
    const summaryItems = [
        { label: 'إجمالي التحصيل', value: formatCurrency(totals.total, cur) },
        { label: 'نقدي', value: formatCurrency(totals.cash, cur) },
        { label: 'تحويل/شبكة', value: formatCurrency(totals.bank, cur) },
        { label: 'شيكات', value: formatCurrency(totals.check, cur) },
    ];
    summaryItems.forEach((item, i) => {
        const x = 200 - i * 45;
        doc.text(`${item.label}: ${item.value}`, x, y, { align: 'right' });
    });

    const head = [['ملاحظات', 'طريقة الدفع', 'المبلغ', 'المستأجر', 'رقم السند']];
    const body = receipts.map(r => [
        r.ref || '-',
        r.channelAr || r.channel,
        formatCurrency(r.amount, cur),
        r.tenantName || '-',
        r.no,
    ]);
    body.push([
        { content: '', styles: {} },
        { content: '', styles: {} },
        { content: formatCurrency(totals.total, cur), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } } as PdfCell,
    ] as PdfCell);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: 38,
        styles: TABLE_STYLE,
        headStyles: HEAD_STYLE,
    });
    doc.save(`Daily_Collection_${date}.pdf`);
};

export const exportExpensesReportToPdf = (expenses: Expense[], byCategory: [string, number][], totalExpenses: number, settings: Settings, dateRange: string) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('تقرير المصروفات', dateRange, settings);

    if (byCategory.length > 0) {
        const catBody = byCategory.map(([cat, amt]) => [formatCurrency(amt, cur), cat]);
        catBody.push([
            { content: formatCurrency(totalExpenses, cur), styles: { fontStyle: 'bold' } } as PdfCell,
            { content: 'الإجمالي', styles: { fontStyle: 'bold', halign: 'center' } } as PdfCell,
        ]);
        asAutoTableDoc(doc).autoTable({
            head: [['المبلغ', 'الفئة']],
            body: catBody,
            startY: 35,
            styles: TABLE_STYLE,
            headStyles: { ...HEAD_STYLE, fillColor: [100, 50, 50] },
        });
    }

    const detailY = byCategory.length > 0 ? (asAutoTableDoc(doc).lastAutoTable?.finalY || 35) + 8 : 35;
    const head = [['ملاحظات', 'المبلغ', 'المستفيد', 'الفئة', 'التاريخ', 'الرقم']];
    const body = expenses.map(e => [
        e.notes || '-',
        formatCurrency(e.amount, cur),
        e.payee || '-',
        e.category,
        formatDate(e.dateTime),
        e.no,
    ]);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: detailY,
        styles: TABLE_STYLE,
        headStyles: HEAD_STYLE,
        footStyles: FOOT_STYLE,
    });
    doc.save('Expenses_Report.pdf');
};

export const exportDepositsReportToPdf = (contracts: PdfRow[], totalDeposits: number, settings: Settings) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('تقرير التأمينات (الودائع)', `تاريخ التقرير: ${formatDate(new Date().toISOString())}`, settings);

    doc.setFontSize(10);
    doc.text(`إجمالي التأمينات: ${formatCurrency(totalDeposits, cur)}  |  عدد العقود: ${contracts.length}`, 200, 34, { align: 'right' });

    const head = [['نهاية العقد', 'بداية العقد', 'مبلغ التأمين', 'العقار', 'الوحدة', 'المستأجر']];
    const body = contracts.map((c: PdfRow) => [
        formatDate(c.end),
        formatDate(c.start),
        formatCurrency(c.deposit, cur),
        c.propertyName || '-',
        c.unitName || '-',
        c.tenantName || '-',
    ]);
    body.push([
        { content: '', styles: {} },
        { content: '', styles: {} },
        { content: formatCurrency(totalDeposits, cur), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } } as PdfCell,
    ] as PdfCell);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: 40,
        styles: TABLE_STYLE,
        headStyles: HEAD_STYLE,
    });
    doc.save('Deposits_Report.pdf');
};

export const exportMaintenanceReportToPdf = (records: PdfRow[], totalCost: number, settings: Settings, dateRange: string) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('تقرير الصيانة', dateRange, settings);

    const head = [['الحالة', 'التكلفة', 'على حساب', 'الوصف', 'الوحدة', 'التاريخ']];
    const body = records.map((m: PdfRow) => [
        m.statusAr || m.status,
        formatCurrency(m.cost || 0, cur),
        m.chargedToAr || m.chargedTo,
        m.description,
        m.unitName || '-',
        m.requestDate,
    ]);
    body.push([
        { content: '', styles: {} },
        { content: formatCurrency(totalCost, cur), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } } as PdfCell,
    ] as PdfCell);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: 35,
        styles: TABLE_STYLE,
        headStyles: HEAD_STYLE,
    });
    doc.save('Maintenance_Report.pdf');
};

export const exportOverdueTenantsToPdf = (overdue: PdfRow[], totalOverdue: number, settings: Settings) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('تقرير المتأخرين عن الدفع', `تاريخ التقرير: ${formatDate(new Date().toISOString())}`, settings);

    doc.setFontSize(10);
    doc.text(`إجمالي المتأخرات: ${formatCurrency(totalOverdue, cur)}  |  عدد الفواتير: ${overdue.length}`, 200, 34, { align: 'right' });

    const head = [['المبلغ المستحق', 'أيام التأخير', 'تاريخ الاستحقاق', 'العقار', 'الوحدة', 'الهاتف', 'المستأجر']];
    const body = overdue.map((r: PdfRow) => [
        formatCurrency(r.remaining, cur),
        `${r.daysOverdue} يوم`,
        formatDate(r.dueDate),
        r.propertyName || '-',
        r.unitName || '-',
        r.phone || '-',
        r.tenantName || '-',
    ]);
    body.push([
        { content: formatCurrency(totalOverdue, cur), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } } as PdfCell,
    ] as PdfCell);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: 40,
        styles: TABLE_STYLE,
        headStyles: HEAD_STYLE,
        didParseCell: (data: PdfRow) => {
            if (data.section === 'body' && data.column.index === 1) {
                const days = parseInt(data.cell.raw);
                if (days > 90) data.cell.styles.textColor = [185, 28, 28];
                else if (days > 60) data.cell.styles.textColor = [234, 88, 12];
                else if (days > 30) data.cell.styles.textColor = [202, 138, 4];
            }
        },
    });
    doc.save('Overdue_Tenants.pdf');
};

export const exportVacantUnitsToPdf = (units: PdfRow[], totalPotentialRent: number, settings: Settings) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('تقرير الوحدات الشاغرة', `تاريخ التقرير: ${formatDate(new Date().toISOString())}`, settings);

    doc.setFontSize(10);
    doc.text(`عدد الوحدات الشاغرة: ${units.length}  |  الإيجار المحتمل الشهري: ${formatCurrency(totalPotentialRent, cur)}`, 200, 34, { align: 'right' });

    const head = [['الحالة', 'الإيجار المقترح', 'الحمامات', 'الغرف', 'المساحة', 'الطابق', 'النوع', 'الوحدة', 'العقار']];
    const body = units.map((r: PdfRow) => [
        r.statusAr || r.status,
        r.rentDefault ? formatCurrency(r.rentDefault, cur) : '-',
        r.bathrooms ?? '-',
        r.bedrooms ?? '-',
        r.area ? `${r.area} م²` : '-',
        r.floorAr || r.floor || '-',
        r.typeAr || r.type || '-',
        r.name,
        r.propertyName || '-',
    ]);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: 40,
        styles: { ...TABLE_STYLE, fontSize: 8 },
        headStyles: HEAD_STYLE,
    });
    doc.save('Vacant_Units.pdf');
};

export const exportUtilitiesReportToPdf = (records: PdfRow[], totalAmount: number, byType: Record<string, { amount: number; count: number }>, settings: Settings, dateRange: string) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc('تقرير المرافق والخدمات', dateRange, settings);

    doc.setFontSize(10);
    let y = 34;
    doc.text(`إجمالي فواتير المرافق: ${formatCurrency(totalAmount, cur)}`, 200, y, { align: 'right' });
    y += 6;
    const typeEntries = Object.entries(byType);
    if (typeEntries.length > 0) {
        const summary = typeEntries.map(([t, v]) => `${UTILITY_TYPE_AR[t as UtilityType] || t}: ${formatCurrency(v.amount, cur)} (${v.count})`).join('  |  ');
        doc.setFontSize(8);
        doc.text(summary, 200, y, { align: 'right' });
    }

    const head = [['على حساب', 'المبلغ', 'سعر الوحدة', 'الاستهلاك', 'المرفق', 'العقار', 'الوحدة', 'الشهر']];
    const body = records.map((r: PdfRow) => [
        r.paidByAr || r.paidBy,
        formatCurrency(r.amount, cur),
        formatCurrency(r.unitPrice, cur),
        `${r.consumption} وحدة`,
        UTILITY_TYPE_AR[r.type as UtilityType] || r.type,
        r.propertyName || '-',
        r.unitName || '-',
        r.month,
    ]);
    body.push([
        { content: '', styles: {} },
        { content: formatCurrency(totalAmount, cur), styles: { fontStyle: 'bold' } },
        { content: 'الإجمالي', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } } as PdfCell,
    ] as PdfCell);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: y + 5,
        styles: { ...TABLE_STYLE, fontSize: 8 },
        headStyles: HEAD_STYLE,
    });
    doc.save('Utilities_Report.pdf');
};

export const exportPropertyReportToPdf = (property: PdfRow, owner: PdfRow, units: PdfRow[], totalRent: number, annualIncome: number, maintenanceCost: number, settings: Settings) => {
    const cur = settings.operational.currency;
    const doc = getArabicDoc(`تقرير عقار: ${property.name}`, `تاريخ التقرير: ${formatDate(new Date().toISOString())}`, settings);

    doc.setFontSize(10);
    let y = 34;
    doc.text(`المالك: ${owner?.name || '-'}`, 200, y, { align: 'right' });
    doc.text(`الموقع: ${property.location || '-'}`, 100, y, { align: 'right' });
    y += 7;
    const rented = units.filter((u: PdfRow) => u.status === 'RENTED').length;
    const available = units.filter((u: PdfRow) => u.status !== 'RENTED').length;
    doc.text(`إجمالي الوحدات: ${units.length}  |  مؤجرة: ${rented}  |  شاغرة: ${available}  |  الدخل الشهري: ${formatCurrency(totalRent, cur)}  |  السنوي: ${formatCurrency(annualIncome, cur)}  |  الصيانة: ${formatCurrency(maintenanceCost, cur)}`, 200, y, { align: 'right' });

    const head = [['التأمين', 'الإيجار', 'المستأجر', 'الحالة', 'النوع', 'الوحدة']];
    const body = units.map((u: PdfRow) => [
        u.deposit ? formatCurrency(u.deposit, cur) : '-',
        u.rent ? formatCurrency(u.rent, cur) : '-',
        u.tenantName || '-',
        u.statusAr || u.status,
        u.type || '-',
        u.name,
    ]);

    asAutoTableDoc(doc).autoTable({
        head, body, startY: y + 5,
        styles: TABLE_STYLE,
        headStyles: HEAD_STYLE,
        didParseCell: (data: PdfRow) => {
            if (data.section === 'body' && data.column.index === 3) {
                const val = data.cell.raw;
                if (val === 'مؤجرة') data.cell.styles.textColor = [21, 128, 61];
                else if (val === 'شاغرة') data.cell.styles.textColor = [202, 138, 4];
            }
        },
    });
    doc.save(`Property_Report_${property.name}.pdf`);
};
