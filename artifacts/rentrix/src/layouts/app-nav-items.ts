import { BarChart3, Building2, ClipboardList, DoorOpen, FileText, LayoutDashboard, ReceiptText, Settings, UserRoundCog, Users, WalletCards, Wrench } from 'lucide-react';

export const navGroups = [
  ['نظرة عامة', [['/', 'dashboard', 'ملخص الأداء اليومي', LayoutDashboard]]],
  ['إدارة العقارات والعلاقات', [
    ['/properties', 'properties', 'الأصول والوحدات والمواقع', Building2],
    ['/units', 'units', 'كل الوحدات وحالات الإشغال', DoorOpen],
    ['/people', 'people', 'دليل جهات التعامل', Users],
    ['/tenants', 'tenants', 'بيانات المستأجرين', Users],
    ['/owners', 'owners', 'ملفات الملاك', UserRoundCog],
    ['/contracts', 'contracts', 'العقود والتجديدات', FileText],
  ]],
  ['التحصيل والتقارير', [
    ['/financials', 'financials', 'التحصيل والمصروفات', WalletCards],
    ['/invoices', 'invoices', 'الفواتير المستحقة', ReceiptText],
    ['/receipts', 'receipts', 'سجل الإيصالات والطباعة', ReceiptText],
    ['/expenses', 'expenses', 'مصاريف العقارات التشغيلية', WalletCards],
    ['/arrears', 'arrears', 'متابعة المبالغ المتأخرة', ClipboardList],
    ['/reports', 'reports', 'مؤشرات وتقارير الإدارة', BarChart3],
  ]],
  ['التشغيل والنظام', [
    ['/maintenance', 'maintenance', 'الطلبات وحالة التنفيذ', Wrench],
    ['/settings', 'settings', 'تخصيص تجربة النظام', Settings],
  ]],
] as const;

export const quickLinks = [
  ['/properties/new', 'إضافة عقار', Building2],
  ['/people/new', 'إضافة شخص', Users],
  ['/contracts/new', 'إنشاء عقد', FileText],
] as const;

export type QuickLinkRoute = (typeof quickLinks)[number][0];
