import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-2xl bg-primary/10 px-4 py-3 text-2xl">🏢</div>
        <h3 className="text-lg font-black">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
