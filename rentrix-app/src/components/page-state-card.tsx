import type { ReactNode } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PageStateCardProps = Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
}>;

type WriteErrorCardProps = Readonly<{
  message: string;
}>;

export function PageStateCard({ title, description, action }: PageStateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action}
      </CardHeader>
    </Card>
  );
}

export function WriteErrorCard({ message }: WriteErrorCardProps) {
  return (
    <Card role="alert" className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle>لم يتم حفظ التغيير</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
