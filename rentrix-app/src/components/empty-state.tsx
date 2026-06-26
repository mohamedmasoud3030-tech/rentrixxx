import { Inbox } from 'lucide-react';
import type { AriaAttributes, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  role?: 'status' | 'alert';
  ariaLive?: AriaAttributes['aria-live'];
};

export function EmptyState({ title, description, action, role = 'status', ariaLive = 'polite' }: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-card/82" role={role} aria-live={ariaLive}>
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
        <div className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Inbox className="size-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black">{title}</h3>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
