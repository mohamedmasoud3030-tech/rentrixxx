import { ArrowUpLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ReportCardProps = Readonly<{ id?: string; title: string; description: string; children: React.ReactNode; action?: React.ReactNode; isLoading?: boolean }>;

type SafeLinkProps = Readonly<{
  href: string;
  label: string;
}>;

export function SafeAnchor({ href, label }: SafeLinkProps) {
  return (
    <a className="inline-flex items-center gap-1 font-black text-primary hover:underline" href={href}>
      {label}
      <ArrowUpLeft className="size-3" />
    </a>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 p-4" role="status" aria-live="polite" aria-label="جارٍ تحميل هذا التقرير">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

export function ReportCard({ id, title, description, action, children, isLoading = false }: ReportCardProps) {
  return (
    <Card id={id} className="scroll-mt-28 overflow-hidden border-border/60">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <CardTitle className="text-sm font-black">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isLoading ? null : action}
      </CardHeader>
      <CardContent className="p-0">{isLoading ? <SectionSkeleton /> : children}</CardContent>
    </Card>
  );
}
