import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Banknote, FileText, ReceiptText, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const quickActions = [
  { label: 'إنشاء عقد', to: '/contracts/new', icon: FileText },
  { label: 'الفواتير', to: '/invoices', icon: ReceiptText },
  { label: 'المتأخرات', to: '/arrears', icon: AlertTriangle },
  { label: 'المالية', to: '/financials', icon: WalletCards },
  { label: 'التقارير', to: '/reports', icon: Banknote },
] as const;

export function DashboardQuickActions() {
  return <Card><CardHeader><CardTitle>إجراءات سريعة</CardTitle><CardDescription>اختصارات للعمليات اليومية الأكثر استخدامًا.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{quickActions.map((action) => { const Icon = action.icon; return <Button key={action.to} asChild variant="secondary" className="justify-between"><Link to={action.to}><span className="inline-flex items-center gap-2"><Icon className="size-4" />{action.label}</span><ArrowLeft className="size-4" /></Link></Button>; })}</CardContent></Card>;
}
