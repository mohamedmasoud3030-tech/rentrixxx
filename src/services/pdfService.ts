const head = [['الرصيد المستحق', 'التأمين', 'الإيجار', 'انتهاء العقد', 'بدء العقد', 'المستأجر', 'الحالة', 'الوحدة', 'العقار']];

export const exportIncomeStatementToPdf = (pnlData: { totalRevenue: number; totalExpense: number; netIncome: number; revenues: PdfRow[]; expenses: PdfRow[] }, settings: Settings, dateRange: string) => {
    [{ content: 'الإيرادات', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: formatCurrency(pnlData.totalRevenue, settings.operational.currency), styles: { fontStyle: 'bold' } }],
    [{ content: 'المصروفات', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: `(${formatCurrency(pnlData.totalExpense, settings.operational.currency)})`, styles: { fontStyle: 'bold' } }],
    [{ content: 'صافي الربح / (الخسارة)', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }, { content: formatCurrency(pnlData.netIncome, settings.operational.currency), styles: { fontStyle: 'bold' } }],
};

addWrappedText(`واتفق الطرفين على أن يستأجر الطرف الثاني من الطرف الأول ما هو ${unit?.type} رقم (${unit?.name}) في العقار (${property?.name}).`);
addWrappedText(`كما قام الطرف الثاني بدفع مبلغ وقدره (${formatCurrency(contract.deposit, db.settings.operational.currency)}) كتأمين لا يرد إلا عند انتهاء العقد.`);
addWrappedText('3. لا يجوز للطرف الثاني تأجير العين من الباطن أو التنازل عنها للغير دون موافقة خطية من الطرف الأول.');

export const exportBalanceSheetToPdf = (data: { assets: PdfRow[]; liabilities: PdfRow[]; equity: PdfRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number }, settings: Settings, date: string) => {

};

doc.text(`إجمالي الوحدات: ${units.length}  |  مؤجرة: ${rented}  |  شاغرة: ${available}  |  الدخل الشهري: ${formatCurrency(totalRent, cur)}  |  السنوي: ${formatCurrency(annualIncome, cur)}  |  الصيانة: ${formatCurrency(maintenanceCost, cur)}`, 200, y, { align: 'right' });