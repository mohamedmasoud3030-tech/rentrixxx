import { BadgeDollarSign, BarChart3, Building2, ClipboardList, ContactRound, DoorOpen, FileText, LayoutDashboard, ListChecks, MapPinned, MessageSquareText, ReceiptText, SearchCheck, Settings, ShieldCheck, UserRoundCog, Users, WalletCards, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppPermission } from '@/features/auth/permissions';

export type NavItem = readonly [to: string, labelKey: string, description: string, Icon: LucideIcon, permission?: AppPermission];
export type MobileNavItem = readonly [to: string, labelKey: string, Icon: LucideIcon, permission?: AppPermission];
export type NavGroup = readonly [sectionTitle: string, items: readonly NavItem[]];

export const navGroups = [
  ['الرئيسية', [['/', 'dashboard', 'ملخص الأداء اليومي', LayoutDashboard]]],
  ['العقارات والوحدات', [
    ['/properties', 'properties', 'ملفات العقارات والأصول', Building2],
    ['/units', 'units', 'كل الوحدات وحالات الإشغال', DoorOpen],
    ['/lands', 'lands', 'إدارة قطع الأراضي ومتابعة حالتها', MapPinned, 'lands.view'],
  ]],
  ['الأطراف', [
    ['/people', 'people', 'دليل جهات التعامل', Users],
    ['/owners', 'owners', 'إدارة ملفات الملاك وعلاقات الملكية', UserRoundCog, 'owners.hub.view'],
    ['/tenants', 'tenants', 'بيانات المستأجرين', Users],
  ]],
  ['التأجير والتشغيل', [
    ['/contracts', 'contracts', 'العقود والتجديدات', FileText],
    ['/maintenance', 'maintenance', 'طلبات الصيانة والمتابعة', Wrench, 'maintenance.view'],
    ['/communication', 'communication', 'سجل التواصل الداخلي والمتابعات', MessageSquareText, 'communication.view'],
  ]],
  ['الماليات', [
    ['/invoices', 'invoices', 'الفواتير المستحقة', ReceiptText],
    ['/receipts', 'collectionsReceipts', 'التحصيلات والإيصالات', ReceiptText],
    ['/expenses', 'expenses', 'مصاريف العقارات التشغيلية', WalletCards],
    ['/arrears', 'arrears', 'متابعة المبالغ المتأخرة', ClipboardList],
  ]],
  ['التقارير والكشوف', [
    ['/reports', 'reports', 'مركز التقارير التشغيلية', BarChart3],
    ['/reports', 'statements', 'كشوف حركة للقراءة فقط بدون دفتر أستاذ', ReceiptText],
  ]],
  ['المبيعات', [
    ['/leads', 'leads', 'مصادر العملاء المحتملين والتحويلات', ContactRound, 'leads.view'],
    ['/commissions', 'commissions', 'تتبع عمولات المكتب كحالة تشغيلية فقط', BadgeDollarSign, 'commissions.view'],
  ]],
  ['الإعدادات', [
    ['/settings', 'settings', 'إعدادات المكتب والأمان والحساب', Settings, 'settings.manage'],
  ]],
  ['إدارة النظام', [
    ['/audit-log', 'auditLog', 'سجل أحداث الحوكمة قراءة فقط', ListChecks, 'audit.view'],
    ['/data-integrity', 'dataIntegrity', 'فحوصات سلامة البيانات', SearchCheck, 'integrity.view'],
    ['/system', 'system', 'إدارة حوكمة النظام', ShieldCheck, 'system.view'],
  ]],
] as const satisfies readonly NavGroup[];

export const mobileNavItems = [
  ['/', 'dashboard', LayoutDashboard],
  ['/properties', 'properties', Building2],
  ['/contracts', 'contracts', FileText],
  ['/financials', 'financials', WalletCards],
  ['/arrears', 'arrears', ClipboardList],
] as const satisfies readonly MobileNavItem[];

export const quickLinks = [
  ['/properties/new', 'إضافة عقار', Building2],
  ['/people/new', 'إضافة شخص', Users],
  ['/contracts/new', 'إنشاء عقد', FileText],
] as const;

export type QuickLinkRoute = (typeof quickLinks)[number][0];
