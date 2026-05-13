import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUiStore } from '@/store/ui-store';

export function SettingsPage() {
  const { theme, syncStatus, lastSyncedAt } = useUiStore();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التطبيق</CardTitle>
          <CardDescription>إعدادات محلية لسطح المكتب بدون تعدد مستأجرين أو صلاحيات معقدة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">السمة</span><span>{theme}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">حالة المزامنة</span><span>{syncStatus}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">آخر مزامنة</span><span>{lastSyncedAt ?? 'لم تتم بعد'}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
