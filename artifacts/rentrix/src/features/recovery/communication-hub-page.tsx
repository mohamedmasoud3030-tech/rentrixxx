import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export function CommunicationHubPage() {
  return (
    <section className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>مركز التواصل</CardTitle>
          <CardDescription>عرض موحد للتواصل. الإرسال عبر القنوات الخارجية سيتوفر بعد تفعيل الخدمات الخلفية.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="لا توجد محادثات متاحة حالياً"
            description="لا يوجد مخطط/خدمات مراسلة مفعلة في البيئة الحالية."
            action={<Button disabled>إرسال رسالة (غير متاح)</Button>}
          />
        </CardContent>
      </Card>
    </section>
  );
}
