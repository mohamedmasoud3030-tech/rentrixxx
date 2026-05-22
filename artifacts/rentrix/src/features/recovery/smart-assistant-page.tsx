import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function SmartAssistantPage() {
  return (
    <section className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>المساعد الذكي</CardTitle>
          <CardDescription>مساحة عمل للمساعد. التكاملات التشغيلية قيد الإتاحة في الإصدارات القادمة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="اكتب ملاحظاتك أو سؤالك الداخلي..." rows={5} />
          <div className="flex flex-wrap gap-2">
            <Button disabled variant="secondary">تحليل المتأخرات (قريباً)</Button>
            <Button disabled variant="secondary">اقتراح رسائل للمستأجرين (قريباً)</Button>
            <Button disabled variant="secondary">ملخص أداء الممتلكات (قريباً)</Button>
          </div>
          <p className="text-xs text-muted-foreground">تم تعطيل الإجراءات غير المتاحة لتجنب أي سلوك وهمي.</p>
        </CardContent>
      </Card>
    </section>
  );
}
