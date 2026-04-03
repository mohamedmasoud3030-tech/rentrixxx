import {
  BarChart2,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  ClipboardList,
  CreditCard,
  FileText,
  LandPlot,
  LayoutGrid,
  Receipt,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AR_LABELS } from './labels.ar';

export interface NavigationMetaItem {
  title: string;
  titleAr: string;
  icon: LucideIcon;
  description?: string;
}

export const NAVIGATION_META: Record<string, NavigationMetaItem> = {
  '/': { title: 'Dashboard', titleAr: AR_LABELS.dashboard, icon: LayoutGrid, description: 'نظرة شاملة على أداء المحفظة العقارية والمؤشرات الرئيسية' },
  '/properties': { title: 'Properties', titleAr: AR_LABELS.properties, icon: Building2, description: 'إدارة العقارات والوحدات والوحدات الفرعية المؤجرة' },
  '/tenants': { title: 'Tenants', titleAr: AR_LABELS.tenants, icon: Users, description: 'إدارة بيانات المستأجرين والتواصل معهم' },
  '/owners': { title: 'Owners', titleAr: AR_LABELS.owners, icon: UserCheck, description: 'إدارة بيانات الملاك وعمولاتهم' },
  '/contracts': { title: 'Contracts', titleAr: AR_LABELS.contracts, icon: FileText, description: 'عرض وإدارة عقود الإيجار النشطة والمنتهية' },
  '/maintenance': { title: 'Maintenance', titleAr: AR_LABELS.maintenance, icon: Wrench, description: 'إدارة طلبات الصيانة ومتابعة حالتها' },
  '/financial': { title: 'Financial', titleAr: AR_LABELS.financial, icon: WalletCards },
  '/financial/invoices': { title: 'Invoices', titleAr: AR_LABELS.invoices, icon: Receipt, description: 'إدارة الفواتير الشهرية ومتابعة المدفوعات المتأخرة' },
  '/financial/payments': { title: 'Payments', titleAr: AR_LABELS.payments, icon: CreditCard, description: 'إدارة المدفوعات ومراقبة التحصيل النقدي' },
  '/financial/expenses': { title: 'Expenses', titleAr: AR_LABELS.expenses, icon: WalletCards, description: 'متابعة مصروفات العقارات والمكاتب' },
  '/financial/receipts': { title: 'Receipts', titleAr: AR_LABELS.receipts, icon: ClipboardList, description: 'سندات القبض وتدفقات التحصيل' },
  '/financial/arrears': { title: 'Arrears', titleAr: AR_LABELS.arrears, icon: FileText, description: 'متابعة الفواتير المتأخرة والمبالغ المستحقة' },
  '/financial/maintenance': { title: 'Financial Maintenance', titleAr: AR_LABELS.financialMaintenance, icon: Wrench, description: 'متابعة طلبات الصيانة والقيود المرتبطة بها' },
  '/financial/gl': { title: 'General Ledger', titleAr: AR_LABELS.generalLedger, icon: Calculator, description: 'القيود المحاسبية والسجل المالي التفصيلي' },
  '/financial/accounting': { title: 'Chart of Accounts', titleAr: AR_LABELS.chartOfAccounts, icon: BookOpen, description: 'إدارة دليل الحسابات والقيد اليدوي وميزان المراجعة' },
  '/reports': { title: 'Reports', titleAr: AR_LABELS.reports, icon: BarChart2, description: 'تقارير الأداء المالي والإشغال والتحليلات الذكية' },
  '/leads': { title: 'Leads', titleAr: AR_LABELS.leads, icon: Users, description: 'إدارة العملاء المحتملين ومتابعة خط الفرص العقارية' },
  '/communication': { title: 'Communication Hub', titleAr: AR_LABELS.communicationHub, icon: Bell, description: 'قوالب الرسائل والإشعارات للمستأجرين والملاك' },
  '/lands': { title: 'Lands', titleAr: AR_LABELS.lands, icon: LandPlot, description: 'إدارة عروض وصفقات الأراضي' },
  '/commissions': { title: 'Commissions', titleAr: AR_LABELS.commissions, icon: WalletCards, description: 'إدارة عمولات الموظفين والوسطاء العقاريين' },
  '/settings': { title: 'Settings', titleAr: AR_LABELS.settings, icon: Settings, description: 'إعدادات النظام والمظهر والمستخدمين والتكاملات' },
  '/audit-log': { title: 'Audit Log', titleAr: AR_LABELS.auditLog, icon: ClipboardList, description: 'سجل شامل لجميع العمليات والأحداث في النظام' },
  '/smart-assistant': { title: 'Smart Assistant', titleAr: AR_LABELS.smartAssistant, icon: Sparkles, description: 'مساعد ذكاء اصطناعي لتحليل البيانات والإجابة على استفساراتك' },
};
