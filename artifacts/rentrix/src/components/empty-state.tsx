import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}>;

export function EmptyState({ title, description, action, icon, className, compact = false }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed bg-card/82', className)}>
      <CardContent className={cn('flex flex-col items-center justify-center gap-4 text-center', compact ? 'min-h-40 p-6' : 'min-h-64')}>
        <div className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/15">
          {icon ?? <Inbox className="size-8" />}
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
