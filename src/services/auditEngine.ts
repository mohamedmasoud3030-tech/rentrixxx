import { Database, AuditIssue } from '../types';

const ENTITY_PATHS: { [key in keyof Database]?: string } = {
    properties: '/properties',
    units: '/properties',
    tenants: '/tenants',
    owners: '/owners',
    contracts: '/contracts',
    invoices: '/financial/invoices',
    receipts: '/financial/receipts',
    expenses: '/financial/expenses',
    maintenanceRecords: '/maintenance',
    journalEntries: '/financial/gl',
};

const createIssue = (
    severity: AuditIssue['severity'],
    title: string,
    description: string,
    entityType?: AuditIssue['entityType'],
    entity?: { id: string; no?: string; name?: string }
): AuditIssue => {
    let entityIdentifier = '';
    if (entity) {
        if (entity.no) entityIdentifier = `#${entity.no}`;
        else if (entity.name) entityIdentifier = entity.name;
        else entityIdentifier = entity.id.slice(0, 8);
    }

    return {
        id: crypto.randomUUID(),
        severity,
        title,
        description,
        entityType,
        entityId: entity?.id,
        entityIdentifier,
        resolutionPath: entityType ? ENTITY_PATHS[entityType as keyof Database] : undefined,
    };
};

export const runDataIntegrityAudit = (db: Database): AuditIssue[] => {
    const issues: AuditIssue[] = [];

    // --- Create Maps for efficient lookups ---
    const owners = new Map(db.owners.map(i => [i.id, i]));
    const properties = new Map(db.properties.map(i => [i.id, i]));
    const units = new Map(db.units.map(i => [i.id, i]));
    const tenants = new Map(db.tenants.map(i => [i.id, i]));
    const contracts = new Map(db.contracts.map(i => [i.id, i]));
    const invoices = new Map(db.invoices.map(i => [i.id, i]));
    const receipts = new Map(db.receipts.map(i => [i.id, i]));

    // ===========================================
    // SECTION 1: CRITICAL ERRORS (Referential Integrity)
    // ===========================================
    db.properties.forEach(p => !owners.has(p.ownerId) && issues.push(createIssue('ERROR', 'عقار بمالك غير صالح', `العقار "${p.name}" مرتبط بمعرّف مالك غير موجود. هذا سيؤدي إلى فشل في حساب كشوفات المالك والتقارير المالية.`, 'properties', p)));
    db.units.forEach(u => !properties.has(u.propertyId) && issues.push(createIssue('ERROR', 'وحدة بعقار غير صالح', `الوحدة "${u.name}" مرتبطة بمعرّف عقار غير موجود. لن تظهر هذه الوحدة في أي مكان.`, 'units', u)));
    db.contracts.forEach(c => {
        if (!units.has(c.unitId)) issues.push(createIssue('ERROR', 'عقد بوحدة غير صالحة', `العقد المرتبط بالمستأجر "${tenants.get(c.tenantId)?.name}" مرتبط بوحدة غير موجودة.`, 'contracts', c));
        if (!tenants.has(c.tenantId)) issues.push(createIssue('ERROR', 'عقد بمستأجر غير صالح', `عقد الوحدة "${units.get(c.unitId)?.name}" مرتبط بمستأجر غير موجود.`, 'contracts', c));
    });
    db.receipts.forEach(r => !contracts.has(r.contractId) && issues.push(createIssue('ERROR', 'سند قبض بعقد غير صالح', `سند القبض رقم "${r.no}" مرتبط بعقد غير موجود. لن يتم احتساب هذا المبلغ في أي تقرير.`, 'receipts', r)));
    db.expenses.forEach(e => e.contractId && !contracts.has(e.contractId) && issues.push(createIssue('ERROR', 'مصروف بعقد غير صالح', `المصروف رقم "${e.no}" مرتبط بعقد غير موجود.`, 'expenses', e)));
    db.receiptAllocations.forEach(ra => {
        if (!receipts.has(ra.receiptId)) issues.push(createIssue('ERROR', 'تخصيص سند غير صالح', `يوجد تخصيص مالي مرتبط بسند قبض محذوف أو غير صالح (ReceiptID: ${ra.receiptId.slice(0,8)}).`, 'receipts'));
        if (!invoices.has(ra.invoiceId)) issues.push(createIssue('ERROR', 'تخصيص فاتورة غير صالحة', `يوجد تخصيص مالي مرتبط بفاتورة محذوفة أو غير صالحة (InvoiceID: ${ra.invoiceId.slice(0,8)}).`, 'invoices'));
    });
    db.journalEntries.forEach(je => {
        if(!db.accounts.find(acc => acc.id === je.accountId)) {
             issues.push(createIssue('ERROR', 'قيد يومية بحساب غير صالح', `القيد رقم "${je.no}" يحتوي على حركة على حساب محذوف أو غير صالح (AccountID: ${je.accountId}). هذا يسبب عدم توازن في ميزان المراجعة.`, 'journalEntries', je));
        }
    });


    // ===========================================
    // SECTION 2: WARNINGS (Data Flow & Quality)
    // ===========================================
    db.maintenanceRecords.forEach(mr => {
        if (['COMPLETED', 'CLOSED'].includes(mr.status) && mr.cost > 0 && !mr.expenseId && !mr.invoiceId) {
            issues.push(createIssue('WARNING', 'انقطاع التدفق المالي للصيانة', `طلب الصيانة المكتمل #${mr.no} بتكلفة ${mr.cost} لم يتم إنشاء مصروف أو فاتورة له. التكلفة لن تنعكس في أي تقرير مالي.`, 'maintenanceRecords', mr));
        }
    });
    db.contracts.forEach(c => {
        if (c.status === 'ACTIVE' && c.rent <= 0) {
            issues.push(createIssue('WARNING', 'عقد نشط بإيجار صفري', `عقد المستأجر "${tenants.get(c.tenantId)?.name}" نشط ولكن قيمة الإيجار صفر. لن يتم إنشاء فواتير صحيحة لهذا العقد.`, 'contracts', c));
        }
    });
    db.receipts.forEach(r => {
        if (r.status === 'POSTED' && r.amount > 0 && !db.receiptAllocations.some(ra => ra.receiptId === r.id)) {
            issues.push(createIssue('WARNING', 'سند قبض غير مخصص', `سند القبض #${r.no} بمبلغ ${r.amount} تم ترحيله ولكنه لم يخصص لأي فاتورة. المبلغ لن يظهر كرصيد مدفوع للمستأجر.`, 'receipts', r));
        }
    });
    const postedReceiptsWithoutJE = db.receipts.filter(r => r.status === 'POSTED' && !db.journalEntries.some(je => je.sourceId === r.id));
    if(postedReceiptsWithoutJE.length > 0) {
        issues.push(createIssue('WARNING', 'سندات قبض بدون قيود يومية', `تم العثور على ${postedReceiptsWithoutJE.length} سندات قبض مرحّلة لا يوجد لها قيود يومية. هذا سيؤدي إلى عدم صحة ميزان المراجعة والتقارير المحاسبية.`, 'journalEntries', postedReceiptsWithoutJE[0]));
    }
    const postedExpensesWithoutJE = db.expenses.filter(e => e.status === 'POSTED' && !db.journalEntries.some(je => je.sourceId === e.id));
     if(postedExpensesWithoutJE.length > 0) {
        issues.push(createIssue('WARNING', 'مصروفات بدون قيود يومية', `تم العثور على ${postedExpensesWithoutJE.length} مصروفات مرحّلة لا يوجد لها قيود يومية. هذا سيؤدي إلى عدم صحة ميزان المراجعة والتقارير المحاسبية.`, 'journalEntries', postedExpensesWithoutJE[0]));
    }


    // ===========================================
    // SECTION 3: INFO (Reasons for empty reports)
    // ===========================================
    const hasPostedReceipts = db.receipts.some(r => r.status === 'POSTED' && r.amount > 0);
    const hasPostedExpenses = db.expenses.some(e => e.status === 'POSTED' && e.amount > 0);
    
    if (!hasPostedReceipts && !hasPostedExpenses) {
        issues.push(createIssue('INFO', 'لا توجد حركات مالية مرحّلة', `جميع التقارير المالية (كشوف الحساب، الأرباح والخسائر) تعتمد على السندات والمصروفات التي حالتها "مرحّل". النظام لا يحتوي على أي حركات مرحّلة حاليًا، مما يؤدي إلى ظهور التقارير فارغة.`, 'receipts'));
    }

    if (db.invoices.length > 0 && db.receipts.length > 0 && db.expenses.length > 0) {
        const allTransactionDates = [...db.receipts.map(r => new Date(r.dateTime)), ...db.expenses.map(e => new Date(e.dateTime))];
        const latestTransaction = new Date(Math.max.apply(null, allTransactionDates.map(d => d.getTime())));
        
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        if (latestTransaction < firstDayOfMonth) {
            issues.push(createIssue('INFO', 'تواريخ البيانات قديمة', `أحدث حركة مالية في النظام بتاريخ ${latestTransaction.toLocaleDateString()}. بعض التقارير (مثل كشف أرباح وخسائر المكتب) تستخدم نطاقًا زمنيًا افتراضيًا للشهر الحالي. قد تكون التقارير فارغة لأن نطاق التاريخ الافتراضي لا يحتوي على بيانات.`, undefined));
        }
    }

    if (db.owners.length > 0 && db.owners.every(o => o.commissionValue <= 0)) {
        issues.push(createIssue('INFO', 'عمولة المكتب غير محددة', `لم يتم تحديد أي عمولة للمكتب من الملاك. هذا سيؤدي إلى أن تكون إيرادات المكتب في تقرير الأرباح والخسائر صفرًا.`, 'owners'));
    }

    return issues;
};
