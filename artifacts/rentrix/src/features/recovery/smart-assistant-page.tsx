import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSmartAssistant } from './use-smart-assistant';
import { AI_ACTIONS, type AiAssistantAction } from '@/services/aiAssistantService';

type AssistantActionDefinition = {
  action: AiAssistantAction;
  label: string;
};

const assistantActions: AssistantActionDefinition[] = [
  { action: AI_ACTIONS[0], label: 'تلخيص الفواتير المتأخرة' },
  { action: AI_ACTIONS[1], label: 'تلخيص تجديد العقود' },
  { action: AI_ACTIONS[2], label: 'صياغة تذكير دفع للمستأجر' },
  { action: AI_ACTIONS[3], label: 'شرح لقطة مالية للعقار' },
];

export function SmartAssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [selectedAction, setSelectedAction] = useState<AiAssistantAction>(AI_ACTIONS[0]);
  const assistantMutation = useSmartAssistant();

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }
    await assistantMutation.mutateAsync({ action: selectedAction, prompt: prompt.trim() });
  };

  return (
    <section className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>المساعد الذكي</CardTitle>
          <CardDescription>مساعد قراءة فقط لتحليل البيانات المالية والتشغيلية دون أي تعديل على البيانات.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {assistantActions.map((item) => (
              <Button
                key={item.action}
                type="button"
                variant={selectedAction === item.action ? 'default' : 'secondary'}
                onClick={() => setSelectedAction(item.action)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <Textarea
            placeholder="اكتب سؤالك أو السياق المطلوب..."
            rows={5}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <Button onClick={handleSubmit} disabled={assistantMutation.isPending || !prompt.trim()}>
            {assistantMutation.isPending ? 'جارٍ التحليل...' : 'إرسال'}
          </Button>

          {assistantMutation.isError ? (
            <p className="text-sm text-destructive">{assistantMutation.error.message}</p>
          ) : null}

          {assistantMutation.data?.message ? (
            <article className="rounded-md border bg-muted/30 p-3 text-sm leading-7">{assistantMutation.data.message}</article>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
