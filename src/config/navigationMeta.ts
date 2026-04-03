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

export interface NavigationMetaItem {
  title: string;
  titleAr: string;
  icon: LucideIcon;
  description?: string;
}

export const NAVIGATION_META: Record<string, NavigationMetaItem> = {
  '/': { title: 'Dashboard', titleAr: 'لوحة التحكم', icon: LayoutGrid, description: 'نظرة شاملة على أداء المحفظة العقارية والمؤشرات الرئيسية' },
  '/properties': { title: 'Properties', titleAr: 'إدارة العقارات', icon: Building2, description: 'إدارة العقارات والوحدات والوحدات الفرعية المؤجرة' },
  '/tenants': { title: 'Tenants', titleAr: 'المستأجرون', icon: Users, description: 'إدارة بيانات المستأجرين والتواصل معهم' },
  '/owners': { title: 'Owners', titleAr: 'الملاك', icon: UserCheck, description: 'إدارة بيانات الملاك وعمولاتهم' },
  '/contracts': { title: 'Contracts', titleAr: 'العقود', icon: FileText, description: 'عرض وإدارة عقود الإيجار النشطة والمنتهية' },
  '/maintenance': { title: 'Maintenance', titleAr: 'الصيانة', icon: Wrench, description: 'إدارة طلبات الصيانة ومتابعة حالتها' },
  '/financial': { title: 'Financial', titleAr: 'الحسابات المالية', icon: WalletCards },
  '/financial/invoices': { title: 'Invoices', titleAr: 'الفواتير', icon: Receipt, description: 'إدارة الفواتير الشهرية ومتابعة المدفوعات المتأخرة' },
  '/financial/payments': { title: 'Payments', titleAr: 'المدفوعات', icon: CreditCard, description: 'إدارة المدفوعات ومراقبة التحصيل النقدي' },
  '/financial/expenses': { title: 'Expenses', titleAr: 'المصروفات', icon: WalletCards, description: 'متابعة مصروفات العقارات والمكاتب' },
  '/financial/receipts': { title: 'Receipts', titleAr: 'سندات القبض', icon: ClipboardList, description: 'سندات القبض وتدفقات التحصيل' },
  '/financial/arrears': { title: 'Arrears', titleAr: 'المتأخرات', icon: FileText, description: 'متابعة الفواتير المتأخرة والمبالغ المستحقة' },
  '/financial/maintenance': { title: 'Financial Maintenance', titleAr: 'صيانة مالية', icon: Wrench, description: 'متابعة طلبات الصيانة والقيود المرتبطة بها' },
  '/financial/gl': { title: 'General Ledger', titleAr: 'الأستاذ العام', icon: Calculator, description: 'القيود المحاسبية والسجل المالي التفصيلي' },
  '/financial/accounting': { title: 'Chart of Accounts', titleAr: 'دليل الحسابات', icon: BookOpen, description: 'إدارة دليل الحسابات والقيد اليدوي وميزان المراجعة' },
  '/reports': { title: 'Reports', titleAr: 'التقارير', icon: BarChart2, description: 'تقارير الأداء المالي والإشغال والتحليلات الذكية' },
  '/leads': { title: 'Leads', titleAr: 'العملاء المحتملون', icon: Users, description: 'إدارة العملاء المحتملين ومتابعة خط الفرص العقارية' },
  '/communication': { title: 'Communication Hub', titleAr: 'مركز التواصل', icon: Bell, description: 'قوالب الرسائل والإشعارات للمستأجرين والملاك' },
  '/lands': { title: 'Lands', titleAr: 'الأراضي', icon: LandPlot, description: 'إدارة عروض وصفقات الأراضي' },
  '/commissions': { title: 'Commissions', titleAr: 'العمولات', icon: WalletCards, description: 'إدارة عمولات الموظفين والوسطاء العقاريين' },
  '/settings': { title: 'Settings', titleAr: 'الإعدادات', icon: Settings, description: 'إعدادات النظام والمظهر والمستخدمين والتكاملات' },
  '/audit-log': { title: 'Audit Log', titleAr: 'سجل المراجعة', icon: ClipboardList, description: 'سجل شامل لجميع العمليات والأحداث في النظام' },
  '/smart-assistant': { title: 'Smart Assistant', titleAr: 'المساعد الذكي', icon: Sparkles, description: 'مساعد ذكاء اصطناعي لتحليل البيانات والإجابة على استفساراتك' },
};
