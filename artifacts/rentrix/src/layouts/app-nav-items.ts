import { BadgeDollarSign, BarChart3, Building2, ClipboardList, ContactRound, DoorOpen, FileText, KeyRound, LayoutDashboard, ListChecks, MapPinned, MessageSquareText, ReceiptText, SearchCheck, Settings, ShieldCheck, UserRoundCog, Users, WalletCards, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppPermission } from '@/features/auth/permissions';

export type NavItem = readonly [to: string, labelKey: string, description: string, Icon: LucideIcon, permission?: AppPermission];
export type MobileNavItem = readonly [to: string, labelKey: string, Icon: LucideIcon, permission?: AppPermission];
export type NavGroup = readonly [sectionTitle: string, items: readonly NavItem[]];

export const navGroups = [
  ['نظرة عامة', [['/', 'dashboard', 'ملخص الأداء اليومي', LayoutDashboard]]],
  ['إدارة العقارات والعلاقات', [
    ['/properties', 'properties', 'الأصول والوحدات والمواقع', Building2],
    ['/units', 'units', 'كل الوحدات وحالات الإشغال', DoorOpen],
    ['/people', 'people', 'دليل جهات التعامل', Users],
    ['/tenants', 'tenants', 'بيانات المستأجرين', Users],
    ['/owners', 'owners', 'إدارة ملفات الملاك وعلاقات الملكية', UserRoundCog, 'owners.hub.view'],
    ['/lands', 'lands', 'إدارة قطع الأراضي ومتابعة حالتها', MapPinned, 'lands.view'],
    ['/leads', 'leads', 'مصادر العملاء المحتملين والتحويلات', ContactRound, 'leads.view'],
    ['/contracts', 'contracts', 'العقود والتجديدات', FileText],
  ]],
  ['التحصيل والتقارير', [
    ['/financials', 'financials', 'التحصيل والمصروفات', WalletCards],
    ['/invoices', 'invoices', 'الفواتير المستحقة', ReceiptText],
    ['/receipts', 'receipts', 'سجل الإيصالات والطباعة', ReceiptText],
    ['/expenses', 'expenses', 'مصاريف العقارات التشغيلية', WalletCards],
    ['/arrears', 'arrears', 'متابعة المبالغ المتأخرة', ClipboardList],
    ['/commissions', 'commissions', 'تتبع عمولات المكتب كحالة تشغيلية فقط', BadgeDollarSign, 'commissions.view'],
    ['/reports', 'reports', 'مؤشرات وتقارير الإدارة', BarChart3],
  ]],
  ['التشغيل والنظام', [
    ['/maintenance', 'maintenance', 'طلبات الصيانة والمتابعة', Wrench, 'maintenance.view'],
    ['/communication', 'communication', 'سجل التواصل الداخلي والمتابعات', MessageSquareText, 'communication.view'],
    ['/audit-log', 'auditLog', 'سجل أحداث الحوكمة قراءة فقط', ListChecks, 'audit.view'],
    ['/data-integrity', 'dataIntegrity', 'فحوصات سلامة البيانات', SearchCheck, 'integrity.view'],
    ['/system', 'system', 'إدارة حوكمة النظام', ShieldCheck, 'system.view'],
    ['/change-password', 'changePassword', 'تحديث كلمة مرورك', KeyRound, 'auth.password.change'],
    ['/settings', 'settings', 'تخصيص تجربة النظام', Settings, 'settings.manage'],
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
