import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAskAssistant } from './use-smart-assistant';

export function SmartAssistantPage() {
  const ask = useAskAssistant();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  async function submit(customPrompt?: string) {
    const text = (customPrompt ?? prompt).trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    const res = await ask.mutateAsync(text);
    if (!res.ok) {
      const msg = res.error === 'إعدادات الذكاء الاصطناعي غير مكتملة' ? 'إعدادات الذكاء الاصطناعي غير مكتملة' : (res.error ?? 'تعذر تنفيذ الطلب');
      setMessages((m) => [...m, { role: 'assistant', text: msg }]);
      return;
    }
    setMessages((m) => [...m, { role: 'assistant', text: res.answer ?? '' }]);
    setPrompt('');
  }

  return (
    <section className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>المساعد الذكي</CardTitle>
          <CardDescription>مساعد تحليلي يعتمد على بيانات التطبيق للقراءة فقط.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Button variant="secondary" onClick={() => submit('لخّص الفواتير المتأخرة الحالية')}>تلخيص المتأخرات</Button>
            <Button variant="secondary" onClick={() => submit('ما العقود التي تقترب من التجديد خلال 60 يوم؟')}>تلخيص التجديدات</Button>
            <Button variant="secondary" onClick={() => submit('اكتب رسالة تذكير عربية للمستأجر بالدفع')}>صياغة تذكير للمستأجر</Button>
            <Button variant="secondary" onClick={() => submit('اشرح لقطة مالية مختصرة للأملاك الحالية')}>لقطة مالية للأملاك</Button>
          </div>
          <Textarea placeholder="اكتب سؤالك..." rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button onClick={() => submit()} disabled={ask.isPending}>إرسال</Button>
          <div className="space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{m.role === 'user' ? 'أنت' : 'المساعد'}</p>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
