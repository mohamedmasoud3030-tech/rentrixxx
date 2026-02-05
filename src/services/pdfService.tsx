
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cairoFontBase64 } from './cairoFontBase64';
import { Settings, Contract, Database, Invoice, Expense } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';

// Helper to create a jsPDF instance with Arabic font support and a standard header
const getArabicDoc = (title: string, subtitle: string, settings: Settings) => {
    const doc = new jsPDF();
    
    // Add Cairo font for Arabic support
    doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
    doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
    doc.setFont('Cairo');

    // Header
    doc.setFontSize(16);
    // FIX: Corrected path to company settings
    doc.text(settings.general.company.name, 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(title, 105, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(subtitle, 105, 28, { align: 'center' });

    return doc;
};

// --- Financial Reports ---

export const exportRentRollToPdf = (units: any[], totals: any, settings: Settings) => {
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

    (doc as any).autoTable({
        head,
        body,
        startY: 35,
        styles: { font: 'Cairo', halign: 'right' },
        headStyles: { fillColor: [30, 80, 130], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    });

    doc.save('Rent_Roll_Report.pdf');
};

export const exportOwnerLedgerToPdf = (transactions: any[], totals: any, settings: Settings, ownerName: string, dateRange: string, showCommission: boolean) => {
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
         (footerRow[3] as any).colSpan = 2; // Adjust colSpan
    } else {
        (footerRow[2] as any).colSpan = 2;
    }

    (doc as any).autoTable({
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

export const exportTenantStatementToPdf = (statementData: any, settings: Settings) => {
    const { tenant, unit, property, statement, finalBalance } = statementData;
    const doc = getArabicDoc('كشف حساب مستأجر', `للمستأجر: ${tenant?.name} - الوحدة: ${unit?.name}`, settings);
    
    doc.setFontSize(10);
    doc.text(`العقار: ${property?.name}`, 200, 40, { align: 'right' });
    doc.text(`الهاتف: ${tenant?.phone}`, 20, 40, { align: 'left' });

    const head = [['الرصيد', 'دائن', 'مدين', 'البيان', 'التاريخ']];
    const body = statement.map((tx: any) => [
        // FIX: Corrected path to currency settings
        formatCurrency(tx.balance, settings.operational.currency),
        tx.credit > 0 ? formatCurrency(tx.credit, settings.operational.currency) : '-',
        tx.debit > 0 ? formatCurrency(tx.debit, settings.operational.currency) : '-',
        tx.description,
        formatDate(tx.date),
    ]);

    (doc as any).autoTable({
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

export const exportIncomeStatementToPdf = (pnlData: any, settings: Settings, dateRange: string) => {
    const doc = getArabicDoc('قائمة الدخل', dateRange, settings);
    
    (doc as any).autoTable({
        startY: 35,
        body: [
            // FIX: Corrected path to currency settings
            [{ content: 'الإيرادات', styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }, { content: formatCurrency(pnlData.totalRevenue, settings.operational.currency), styles: { fontStyle: 'bold' } }],
            ...pnlData.revenues.map((item: any) => [item.name, formatCurrency(item.balance, settings.operational.currency)]),
            [{ content: 'المصروفات', styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }, { content: `(${formatCurrency(pnlData.totalExpense, settings.operational.currency)})`, styles: { fontStyle: 'bold' } }],
            ...pnlData.expenses.map((item: any) => [item.name, `(${formatCurrency(item.balance, settings.operational.currency)})`]),
            [{ content: 'صافي الربح / (الخسارة)', styles: { fontStyle: 'bold', fillColor: '#e2e8f0' } }, { content: formatCurrency(pnlData.netIncome, settings.operational.currency), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        styles: { font: 'Cairo', halign: 'right' },
    });

    doc.save('Income_Statement.pdf');
};


export const exportTrialBalanceToPdf = (data: any, settings: Settings, date: string) => {
    const doc = getArabicDoc('ميزان المراجعة', `حتى تاريخ ${formatDate(date)}`, settings);

    const head = [['دائن', 'مدين', 'اسم الحساب', 'رقم الحساب']];
    const body = data.lines.map((line: any) => [
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
    
    (doc as any).autoTable({
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
};

export const exportExpenseToPdf = (expense: Expense, db: Database) => {
    const { settings } = db;
    const doc = getArabicDoc('سند صرف', `رقم السند: ${expense.no}`, settings);

    doc.setFontSize(11);
    doc.text(`التاريخ: ${formatDate(expense.dateTime)}`, 200, 40, { align: 'right' });
    // FIX: Corrected path to currency settings
    doc.text(`المبلغ: ${formatCurrency(expense.amount, settings.operational.currency)}`, 200, 48, { align: 'right' });
    doc.text(`صرف إلى: ${expense.payee || 'غير محدد'}`, 200, 56, { align: 'right' });
    doc.text(`وذلك عن: ${expense.category} - ${expense.notes || ''}`, 200, 64, { align: 'right' });

    doc.save(`Expense_${expense.no}.pdf`);
};

export const exportInvoiceToPdf = (invoice: Invoice, db: Database) => {
    const { settings } = db;
    const contract = db.contracts.find(c => c.id === invoice.contractId);
    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
    const doc = getArabicDoc('فاتورة', `رقم الفاتورة: ${invoice.no}`, settings);

    doc.setFontSize(11);
    doc.text(`إلى السيد/ة: ${tenant?.name || 'غير معروف'}`, 200, 40, { align: 'right' });
    doc.text(`تاريخ الاستحقاق: ${formatDate(invoice.dueDate)}`, 200, 48, { align: 'right' });

    (doc as any).autoTable({
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

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('الإجمالي:', 200, finalY, { align: 'right' });
    // FIX: Corrected path to currency settings
    doc.text(formatCurrency(invoice.amount + (invoice.taxAmount || 0), settings.operational.currency), 150, finalY, { align: 'right' });

    doc.save(`Invoice_${invoice.no}.pdf`);
};

export const exportBalanceSheetToPdf = (data: any, settings: Settings, date: string) => {
    const doc = getArabicDoc('الميزانية العمومية', `كما في تاريخ ${formatDate(date)}`, settings);
    let y = 35;

    const drawSection = (title: string, items: any[], indent = 0) => {
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

export const exportAgedReceivablesToPdf = (data: any, settings: Settings, date: string) => {
    const doc = getArabicDoc('تقرير أعمار الذمم المدينة', `كما في تاريخ ${formatDate(date)}`, settings);

    const head = [['+90 يوم', '61-90 يوم', '31-60 يوم', '1-30 يوم', 'حالي', 'الإجمالي', 'المستأجر']];
    const body = data.lines.map((line: any) => [
        // FIX: Corrected path to currency settings
        formatCurrency(line['90+'], settings.operational.currency),
        formatCurrency(line['61-90'], settings.operational.currency),
        formatCurrency(line['31-60'], settings.operational.currency),
        formatCurrency(line['1-30'], settings.operational.currency),
        formatCurrency(line.current, settings.operational.currency),
        formatCurrency(line.total, settings.operational.currency),
        line.tenantName
    ]);
    const footer = [[
        // FIX: Corrected path to currency settings
        formatCurrency(data.totals['90+'], settings.operational.currency),
        formatCurrency(data.totals['61-90'], settings.operational.currency),
        formatCurrency(data.totals['31-60'], settings.operational.currency),
        formatCurrency(data.totals['1-30'], settings.operational.currency),
        formatCurrency(data.totals.current, settings.operational.currency),
        formatCurrency(data.totals.total, settings.operational.currency),
        'الإجمالي'
    ]];

    (doc as any).autoTable({
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