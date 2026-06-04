import { BadgeDollarSign, BarChart3, Building2, ClipboardList, ContactRound, DoorOpen, FileText, KeyRound, LayoutDashboard, ListChecks, MapPinned, MessageSquareText, ReceiptText, SearchCheck, Settings, ShieldCheck, UserRoundCog, Users, WalletCards, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppPermission } from '@/features/auth/permissions';

export type NavItem = readonly [to: string, labelKey: string, description: string, Icon: LucideIcon, permission?: AppPermission];

export type NavGroup = readonly [sectionTitle: string, items: readonly NavItem[]];

export const navGroups = [
  ['نظرة عامة', [['/', 'dashboard', 'ملخص الأداء اليومي', LayoutDashboard]]],
  ['إدارة العقارات والعلاقات', [
    ['/properties', 'properties', 'الأصول والوحدات والمواقع', Building2],
    ['/units', 'units', 'كل الوحدات وحالات الإشغال', DoorOpen],
    ['/people', 'people', 'دليل جهات التعامل', Users],
    ['/tenants', 'tenants', 'بيانات المستأجرين', Users],
    ['/owners-hub', 'ownersHub', 'مركز قراءة موحد للملاك', UserRoundCog, 'owners.hub.view'],
    ['/lands', 'lands', 'حالة استرداد الأراضي', MapPinned, 'lands.view'],
    ['/leads', 'leads', 'حالة استرداد العملاء المحتملين', ContactRound, 'leads.view'],
    ['/contracts', 'contracts', 'العقود والتجديدات', FileText],
  ]],
  ['التحصيل والتقارير', [
    ['/financials', 'financials', 'التحصيل والمصروفات', WalletCards],
    ['/commissions', 'commissions', 'قراءة آمنة للعمولات', BadgeDollarSign, 'commissions.view'],
    ['/invoices', 'invoices', 'الفواتير المستحقة', ReceiptText],
    ['/receipts', 'receipts', 'سجل الإيصالات والطباعة', ReceiptText],
    ['/expenses', 'expenses', 'مصاريف العقارات التشغيلية', WalletCards],
    ['/arrears', 'arrears', 'متابعة المبالغ المتأخرة', ClipboardList],
    ['/reports', 'reports', 'مؤشرات وتقارير الإدارة', BarChart3],
  ]],
  ['التشغيل والنظام', [
    ['/maintenance', 'maintenance', 'الطلبات وحالة التنفيذ', Wrench],
    ['/communication', 'communication', 'مركز التواصل قراءة فقط', MessageSquareText, 'communication.view'],
    ['/system', 'system', 'مركز الحوكمة النظامية', ShieldCheck, 'system.view'],
    ['/audit-log', 'auditLog', 'أحداث الحوكمة قراءة فقط', ListChecks, 'audit.view'],
    ['/data-integrity', 'dataIntegrity', 'فحوصات سلامة البيانات', SearchCheck, 'integrity.view'],
    ['/change-password', 'changePassword', 'تحديث كلمة مرورك', KeyRound, 'auth.password.change'],
    ['/settings', 'settings', 'تخصيص تجربة النظام', Settings, 'settings.manage'],
  ]],
] as const satisfies readonly NavGroup[];

export const quickLinks = [
  ['/properties/new', 'إضافة عقار', Building2],
  ['/people/new', 'إضافة شخص', Users],
  ['/contracts/new', 'إنشاء عقد', FileText],
] as const;

export type QuickLinkRoute = (typeof quickLinks)[number][0];
